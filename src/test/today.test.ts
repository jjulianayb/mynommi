import { describe, expect, it } from 'vitest';
import { awaitingReply, greeting, hasPending, questionFor, DAILY_QUESTIONS } from '@/lib/today';
import { demoState, emptyState } from '@/lib/friends-data';

describe('Conta nova e rotina diária', () => {
  it('conta nova começa sem matches, mensagens, pontos, desafios nem mural', () => {
    expect(emptyState.matches).toEqual([]);
    expect(emptyState.messages).toEqual({});
    expect(emptyState.points.every((p) => p === 0)).toBe(true);
    expect(emptyState.challenges).toEqual([]);
    expect(emptyState.wall).toEqual([]);
  });
  it('conta nova mantém os convites de exemplo como sugestões', () => {
    expect(emptyState.invites?.length).toBeGreaterThan(0);
  });
  it('demonstração continua com amizades preenchidas', () => {
    expect(demoState.matches.length).toBeGreaterThan(0);
  });
  it('sino sem ponto em conta nova', () => {
    expect(hasPending(emptyState)).toBe(false);
  });
  it('sino com ponto quando há figurinha pendente', () => {
    expect(hasPending({ ...emptyState, wall: [{ id: 1, author: 'Carla', status: 'pending' }] })).toBe(true);
  });
  it('quem falou por último não aparece em "ainda não respondeu"', () => {
    const s = { matches: [7, 4], blocked: [], messages: { '7': [{ text: 'oi', mine: true }], '4': [{ text: 'oi', mine: false }] } };
    expect(awaitingReply(s)).toEqual([4]);
  });
  it('mostra no máximo 2 pessoas para dizer oi', () => {
    expect(awaitingReply({ matches: [1, 2, 3], blocked: [], messages: {} })).toHaveLength(2);
  });
  it('saudação da noite é acolhedora e neutra', () => {
    expect(greeting(22, 'Dani')).toBe('Boa noite, Dani. Você não precisa ficar sem companhia esta noite.');
    expect(greeting(9, 'Dani')).toBe('Bom dia, Dani. Um oi já é um começo.');
  });
  it('são 14 perguntas e a pergunta muda de um dia para o outro', () => {
    expect(DAILY_QUESTIONS).toHaveLength(14);
    expect(questionFor('2026-10-11').q).not.toBe(questionFor('2026-10-12').q);
  });
});
