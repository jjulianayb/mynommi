import type { DemoState } from './friends-data';

export const CREDIT_PACKS = [
  { id: 'p10', credits: 10, price: 9.9 },
  { id: 'p30', credits: 30, price: 24.9 },
  { id: 'p80', credits: 80, price: 54.9 },
] as const;
export type PayMethod = 'Pix' | 'Apple Pay' | 'Google Pay';
export const PAY_METHODS: PayMethod[] = ['Pix', 'Apple Pay', 'Google Pay'];
export const BOOST_COST = 5;
export const INVITE_BOOST_COST = 3;
export const BOOST_HOURS = 24;
/** Pessoas de exemplo que compraram destaque (para mostrar o selo no Descobrir). */
export const SAMPLE_BOOSTED_PEOPLE = [12, 8];
export type CreditEntry = { label: string; amount: number; at: string };

type S = Pick<DemoState, 'credits' | 'creditHistory' | 'boostUntil' | 'boostedInvites'>;

export function buyCredits<T extends S>(state: T, packId: string, method: PayMethod, now = new Date()): T {
  const pack = CREDIT_PACKS.find(p => p.id === packId);
  if (!pack) return state;
  return { ...state, credits: (state.credits ?? 0) + pack.credits, creditHistory: [{ label: `${pack.credits} créditos via ${method}`, amount: pack.credits, at: now.toISOString() }, ...(state.creditHistory ?? [])] };
}
function spend<T extends S>(state: T, cost: number, label: string, now: Date): T | null {
  if ((state.credits ?? 0) < cost) return null;
  return { ...state, credits: (state.credits ?? 0) - cost, creditHistory: [{ label, amount: -cost, at: now.toISOString() }, ...(state.creditHistory ?? [])] };
}
export function isBoosted(state: S, now = new Date()) { return !!state.boostUntil && new Date(state.boostUntil).getTime() > now.getTime(); }
/** Destaque de 24 h. Retorna null se não houver créditos; se já estiver ativo, soma 24 h ao fim. */
export function boostProfile<T extends S>(state: T, now = new Date()): T | null {
  const next = spend(state, BOOST_COST, 'Destaque do perfil por 24 h', now);
  if (!next) return null;
  const base = isBoosted(state, now) ? new Date(state.boostUntil as string).getTime() : now.getTime();
  return { ...next, boostUntil: new Date(base + BOOST_HOURS * 3600_000).toISOString() };
}
export function boostInvite<T extends S>(state: T, inviteId: number, now = new Date()): T | null {
  if ((state.boostedInvites ?? []).includes(inviteId)) return state;
  const next = spend(state, INVITE_BOOST_COST, 'Convite em destaque', now);
  return next && { ...next, boostedInvites: [...(state.boostedInvites ?? []), inviteId] };
}
/** Coloca destacados no topo sem passar de 1 a cada 4 cartões; o restante mantém a ordem. */
export function withBoosts<T extends { id: number }>(list: T[], boosted: number[]): T[] {
  const top = list.filter(p => boosted.includes(p.id));
  const rest = list.filter(p => !boosted.includes(p.id));
  const out: T[] = [];
  while (top.length || rest.length) {
    const b = top.shift(); if (b) out.push(b);
    out.push(...rest.splice(0, 3));
    if (!rest.length) { out.push(...top.splice(0)); }
  }
  return out;
}
