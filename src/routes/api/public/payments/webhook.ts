import { createFileRoute } from '@tanstack/react-router';
import { type StripeEnv, verifyWebhook } from '@/lib/stripe.server';
import { creditsForPrice } from '@/lib/credits';

async function fulfill(session: any, env: StripeEnv) {
  const userId = session.metadata?.userId;
  const priceId = session.metadata?.priceId;
  const credits = creditsForPrice(priceId);
  if (!userId || !credits) { console.error('Compra sem usuário ou pacote', session.id); return; }
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { error } = await supabaseAdmin.rpc('grant_purchased_credits', {
    _user_id: userId, _session_id: session.id, _price_id: priceId, _credits: credits,
    _amount: session.amount_total ?? 0, _currency: session.currency ?? 'brl', _env: env,
  });
  if (error) throw error;
}

export const Route = createFileRoute('/api/public/payments/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get('env');
        if (rawEnv !== 'sandbox' && rawEnv !== 'live') return Response.json({ received: true, ignored: 'invalid env' });
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          const obj = event.data.object;
          if (event.type === 'checkout.session.completed' && obj.payment_status !== 'unpaid') await fulfill(obj, env);
          if (event.type === 'checkout.session.async_payment_succeeded') await fulfill(obj, env);
          if (event.type === 'checkout.session.async_payment_failed') console.warn('Pix não pago/expirado; nada creditado', obj.id);
          return Response.json({ received: true });
        } catch (e) {
          console.error('Webhook error:', e);
          return new Response('Webhook error', { status: 400 });
        }
      },
    },
  },
});
