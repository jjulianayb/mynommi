/**
 * A régua de voz do Pippo.
 *
 * O Pippo recebe, explica e faz graça. O que ele **não** faz é dar notícia
 * ruim: erro, senha, privacidade, denúncia, bloqueio, pagamento e apagar a
 * conta continuam na voz da casa.
 *
 * O motivo é simples e caro de descobrir tarde: mascote dando má notícia é o
 * jeito mais rápido de a pessoa achar que o app está tirando sarro dela. Quem
 * perdeu a senha ou foi ofendida numa tribo não quer um personagem engraçado
 * na frente — quer resposta.
 *
 * Esta lista existe para ser conferida por teste, não para ser lida na tela.
 */
export const PIPPO_NAO_FALA_DE = [
  "erro",
  "falha",
  "senha",
  "privacidade",
  "denúncia",
  "bloqueio",
  "pagamento",
  "apagar a conta",
] as const;

/** Onde mandar a pessoa quando o assunto não é do Pippo. */
export const QUANDO_NAO_E_COM_ELE =
  "Sou só o guia: para coisa de conta, senha ou denúncia, o caminho é a Ajuda no menu.";

/** Confere um texto contra a régua. Devolve o que ele não deveria estar dizendo. */
export function foraDaVozDoPippo(texto: string): string[] {
  const t = texto.toLowerCase();
  return PIPPO_NAO_FALA_DE.filter((a) => t.includes(a.toLowerCase()));
}
