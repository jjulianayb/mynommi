import { describe, it, expect } from 'vitest';
import { buyCredits, boostProfile, boostInvite, isBoosted, withBoosts } from '@/lib/credits';
const now = new Date('2026-10-11T12:00:00Z');
describe('Créditos de alcance', () => {
  it('pacotes somam 10, 30 e 80 créditos', () => {
    expect(buyCredits({}, 'p10', 'Pix', now).credits).toBe(10);
    expect(buyCredits({ credits: 10 }, 'p30', 'Apple Pay', now).credits).toBe(40);
    expect(buyCredits({}, 'p80', 'Google Pay', now).credits).toBe(80);
  });
  it('destaque custa 5 créditos e dura 24 h', () => {
    const s = boostProfile({ credits: 7 }, now)!;
    expect(s.credits).toBe(2);
    expect(isBoosted(s, new Date('2026-10-12T11:59:00Z'))).toBe(true);
    expect(isBoosted(s, new Date('2026-10-12T12:01:00Z'))).toBe(false);
  });
  it('sem créditos suficientes não destaca', () => { expect(boostProfile({ credits: 4 }, now)).toBeNull(); expect(boostInvite({ credits: 2 }, 1, now)).toBeNull(); });
  it('destacar convite custa 3 créditos e não cobra duas vezes', () => {
    const s = boostInvite({ credits: 10 }, 2, now)!; expect(s.credits).toBe(7);
    expect(boostInvite(s, 2, now)!.credits).toBe(7);
  });
  it('no máximo 1 destacado a cada 4 cartões', () => {
    const list = [1, 2, 3, 4, 5, 6, 7, 8].map(id => ({ id }));
    expect(withBoosts(list, [7, 8]).map(p => p.id)).toEqual([7, 1, 2, 3, 8, 4, 5, 6]);
  });
});
