import type { Conversa } from "./direct-messages";

/**
 * As suas amizades, no Descobrir.
 *
 * Decisão da Ju: o baralho de cartas continua sendo o Descobrir. Mas com treze
 * contas reais, a fila acaba no primeiro dia — e aí a tela inteira virava
 * "Por hoje, você viu todo mundo", sem mais nada para fazer.
 *
 * Então embaixo do baralho ficam as pessoas com quem você **já** é amiga, com
 * atalho para abrir a conversa. Rede de amizade não é só conhecer gente nova:
 * é manter as amizades que você já fez, que é a parte que o app inteiro estava
 * ignorando.
 *
 * Isso não é enfeite para disfarçar fila vazia. Quando a fila tiver cem
 * pessoas, continuar a amizade vai valer tanto quanto agora.
 */

/**
 * A ordem: primeiro quem está esperando resposta, depois quem nunca conversou,
 * depois o resto pela conversa mais recente.
 *
 * Quem nunca conversou vem antes de quem já conversou de propósito: é a
 * amizade que corre risco de morrer sem nunca ter começado. Uma conversa que
 * já existe volta sozinha.
 */
export function ordemDasAmizades(conversas: Conversa[]): Conversa[] {
  return [...conversas].sort((a, b) => {
    if (a.naoLidas !== b.naoLidas) return b.naoLidas - a.naoLidas;
    const aNova = a.ultimaEm === null;
    const bNova = b.ultimaEm === null;
    if (aNova !== bNova) return aNova ? -1 : 1;
    if (a.ultimaEm && b.ultimaEm) return a.ultimaEm < b.ultimaEm ? 1 : -1;
    return a.nickname.localeCompare(b.nickname, "pt-BR");
  });
}

/**
 * A linha embaixo do nome.
 *
 * Nunca mostra a última mensagem: a tira é larga de um dedo e o recado sairia
 * cortado no meio, além de pôr conversa particular numa tela de descoberta.
 * O que importa aqui é se tem resposta esperando, ou o que liga vocês duas.
 */
export function recadoDaAmizade(c: Conversa): string {
  if (c.naoLidas > 0) return c.naoLidas === 1 ? "1 recado novo" : `${c.naoLidas} recados novos`;
  if (c.ultimaEm === null) return "diga oi";
  if (c.tribosJuntas > 0)
    return c.tribosJuntas === 1 ? "1 tribo junta" : `${c.tribosJuntas} tribos juntas`;
  return "continuar a conversa";
}

/** O título da faixa. Diz o número real, sempre. */
export function tituloDasAmizades(quantas: number): string {
  if (quantas === 1) return "Sua amiga aqui";
  return "Suas amigas aqui";
}

/**
 * O convite, quando a pessoa ainda não tem amizade nenhuma.
 * Aparece no lugar da faixa, nunca junto: faixa vazia com título é pior que
 * nada, porque parece que alguma coisa não carregou.
 */
export const SEM_AMIZADE =
  "Quando alguém disser sim para você, ela aparece aqui para vocês conversarem.";

/** Quantas cabem na tira antes de virar lista. Acima disso, "ver todas". */
export const NA_TIRA = 12;
