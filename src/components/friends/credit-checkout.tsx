import { useCallback, useState } from 'react';
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { CREDIT_PACKS } from '@/lib/credits';
import { money } from '@/lib/friends-data';
import { createCreditCheckout } from '@/lib/payments.functions';
import { getStripe, getStripeEnvironment, paymentsConfigured, paymentsTestMode } from '@/lib/stripe';

function Checkout({ priceId }: { priceId: string }) {
  const create = useServerFn(createCreditCheckout);
  const fetchClientSecret = useCallback(async () => {
    const r = await create({ data: { priceId, environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/carteira?compra=ok` } });
    if ('error' in r) throw new Error(r.error);
    return r.clientSecret;
  }, [create, priceId]);
  return <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
    <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}><EmbeddedCheckout /></EmbeddedCheckoutProvider>
  </div>;
}

/** Compra real de créditos por cartão; o saldo só muda após confirmação do pagamento no servidor. */
export function CreditPurchase() {
  const [pack, setPack] = useState<string>('p30');
  const [open, setOpen] = useState<string | null>(null);
  const chosen = CREDIT_PACKS.find(p => p.id === pack)!;
  if (!paymentsConfigured) return <p className="small-note">Pagamentos ainda não estão ativos nesta versão do app.</p>;
  return <>
    {paymentsTestMode && <p className="small-note">Modo de teste: nenhuma cobrança real. Use o cartão 4242 4242 4242 4242.</p>}
    <div className="pack-grid" role="radiogroup" aria-label="Pacotes de créditos">{CREDIT_PACKS.map(p => <Button key={p.id} type="button" variant="outline" role="radio" aria-checked={pack === p.id} className={'pack-card ' + (pack === p.id ? 'selected' : '')} onClick={() => { setPack(p.id); setOpen(null); }}><strong>{p.credits}</strong><span>créditos</span><small>{money(p.price)}</small></Button>)}</div>
    {open ? <><Checkout key={open} priceId={open} /><Button variant="secondary" className="wide" onClick={() => setOpen(null)}>Cancelar</Button></>
      : <Button className="wide" onClick={() => setOpen(chosen.priceId)}>Pagar {money(chosen.price)}</Button>}
    <p className="small-note">Pague com cartão ou Pix (quando disponível). No Pix, os créditos entram só depois que o pagamento é confirmado; se não pagar, nada é cobrado.</p>
  </>;
}
