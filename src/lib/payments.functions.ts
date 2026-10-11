import { createServerFn } from '@tanstack/react-start';
import type Stripe from 'stripe';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { creditsForPrice } from '@/lib/credits';
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from '@/lib/stripe.server';

async function resolveOrCreateCustomer(stripe: ReturnType<typeof createStripeClient>, options: { email?: string | undefined; userId?: string | undefined }): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error('Invalid userId');
  if (options.userId) {
    const found = await stripe.customers.search({ query: `metadata['userId']:'${options.userId}'`, limit: 1 });
    if (found.data.length) return found.data[0]!.id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0]!;
      if (options.userId && customer.metadata?.['userId'] !== options.userId) {
        await stripe.customers.update(customer.id, { metadata: { ...customer.metadata, userId: options.userId } });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({ ...(options.email && { email: options.email }), ...(options.userId && { metadata: { userId: options.userId } }) });
  return created.id;
}

/** Cria a sessão de pagamento por cartão de um pacote de créditos para a pessoa logada. */
export const createCreditCheckout = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { priceId: string; returnUrl: string; environment: StripeEnv }) => {
    if (!creditsForPrice(data.priceId)) throw new Error('Pacote inválido');
    if (data.environment !== 'sandbox' && data.environment !== 'live') throw new Error('Ambiente inválido');
    if (typeof data.returnUrl !== 'string' || !/^https?:\/\//.test(data.returnUrl)) throw new Error('URL inválida');
    return data;
  })
  .handler(async ({ data, context }): Promise<{ clientSecret: string } | { error: string }> => {
    try {
      const { userId, supabase } = context;
      const { data: { user } } = await supabase.auth.getUser();
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      if (!prices.data.length) throw new Error('Pacote não encontrado');
      const price = prices.data[0]!;
      const productId = typeof price.product === 'string' ? price.product : price.product.id;
      const product = await stripe.products.retrieve(productId);
      const customerId = await resolveOrCreateCustomer(stripe, { email: user?.email ?? undefined, userId });
      const base = {
        line_items: [{ price: price.id, quantity: 1 }],
        mode: 'payment',
        ui_mode: 'embedded_page',
        return_url: data.returnUrl,
        customer: customerId,
        payment_intent_data: { description: product.name },
        metadata: { userId, priceId: data.priceId, managed_payments: 'false' },
      };
      // Tenta cartão + Pix; se a conta ainda não aceita Pix, segue só com cartão.
      let session: Stripe.Checkout.Session;
      try {
        session = await stripe.checkout.sessions.create({ ...base, payment_method_types: ['card', 'pix'], payment_method_options: { pix: { expires_after_seconds: 3600 } } } as Stripe.Checkout.SessionCreateParams);
      } catch (pixError) {
        console.warn('Pix indisponível, usando só cartão:', getStripeErrorMessage(pixError));
        session = await stripe.checkout.sessions.create({ ...base, payment_method_types: ['card'] } as Stripe.Checkout.SessionCreateParams);
      }
      return { clientSecret: session.client_secret ?? '' };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
