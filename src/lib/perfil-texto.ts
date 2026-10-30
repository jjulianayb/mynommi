/**
 * Quanto espaço a pessoa tem para se descrever.
 *
 * Eram 140 caracteres, e a conta da Ju já tinha batido 136: o campo acabava
 * antes da frase. Numa rede de amizade, "sobre mim" é a peça que faz alguém
 * querer conversar — apertar esse campo é apertar o que a nommi existe para
 * fazer. Agora cabe um parágrafo de verdade.
 *
 * O teto continua existindo: sem teto, uma pessoa escreve um livro e a página
 * de todo mundo fica torta.
 */
export const MAX_SOBRE = 600;

/** Quantos interesses o cadastro pede. Mais que isso se escolhe em Meu nommi. */
export const INTERESSES_NO_CADASTRO = { minimo: 3, maximo: 6 };

/** O recado do contador, que muda de tom quando está acabando. */
export function quantoFaltaDoSobre(tamanho: number, max = MAX_SOBRE): string {
  const sobra = max - Math.max(0, tamanho);
  if (sobra <= 0) return "No limite.";
  if (sobra <= 60) return `Faltam ${sobra} caracteres.`;
  return `${tamanho}/${max}`;
}
