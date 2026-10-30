/**
 * A porta da tribo: a verdade com um objetivo.
 *
 * Tribo com pouca gente parece fracasso. A saída honesta não é inventar gente:
 * é dizer quantas são e o que acontece quando chegarem mais. "4 aqui, a
 * primeira conversa abre com 10" transforma o vazio em convite — a pessoa sabe
 * o que falta e sabe que a chamada dela muda o número.
 *
 * Nenhum número aqui é inventado. Tudo sai da contagem real de membros.
 */

/** As portas que a tribo abre conforme vai enchendo. */
export const PORTAS = [
  { em: 3, abre: "a primeira conversa" },
  { em: 10, abre: "o primeiro rolê" },
  { em: 25, abre: "o Só entre nós da tribo" },
] as const;

export type Porta = (typeof PORTAS)[number];

/** A próxima porta ainda fechada, ou null quando já abriu todas. */
export function proximaPorta(membros: number): Porta | null {
  const m = Math.max(0, Math.floor(membros));
  return PORTAS.find((p) => m < p.em) ?? null;
}

export function faltamParaAPorta(membros: number): number {
  const p = proximaPorta(membros);
  return p ? p.em - Math.max(0, Math.floor(membros)) : 0;
}

/** Quanto da barra já encheu, de 0 a 100, até a próxima porta. */
export function quantoEncheu(membros: number): number {
  const m = Math.max(0, Math.floor(membros));
  const p = proximaPorta(m);
  if (!p) return 100;
  const anterior = PORTAS.filter((x) => x.em <= m).slice(-1)[0]?.em ?? 0;
  const vao = p.em - anterior;
  if (vao <= 0) return 100;
  return Math.min(100, Math.round(((m - anterior) / vao) * 100));
}

const gente = (n: number) => (n === 1 ? "1 pessoa" : `${n} pessoas`);

/**
 * A frase da porta.
 * Nunca cobra rolê e nunca finge movimento: diz o número e o que falta.
 */
export function fraseDaPorta(membros: number): string {
  const m = Math.max(0, Math.floor(membros));
  if (m === 0) return "Ninguém aqui ainda. Seja a primeira.";
  const p = proximaPorta(m);
  if (!p) return `${gente(m)} aqui. Esta tribo está completa.`;
  const faltam = p.em - m;
  return `${gente(m)} aqui. Faltam ${faltam} para abrir ${p.abre}.`;
}

/** O convite que vem junto da frase, quando chamar alguém resolve. */
export function convitePelaPorta(membros: number): string {
  const faltam = faltamParaAPorta(membros);
  if (faltam === 0) return "";
  if (faltam === 1) return "Falta uma. Chame alguém que você gosta.";
  return `Chame ${faltam === 2 ? "duas amigas" : "suas amigas"} e a tribo abre.`;
}

/** O que já está aberto nesta tribo, para a tela saber o que mostrar. */
export const portaAberta = (membros: number, oque: Porta["abre"]) =>
  PORTAS.some((p) => p.abre === oque && Math.max(0, Math.floor(membros)) >= p.em);
