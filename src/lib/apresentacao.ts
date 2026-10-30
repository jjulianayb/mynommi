/**
 * A apresentação: o pedacinho entre "criei a conta" e "e agora?".
 *
 * A testadora saiu do cadastro sem entender como encontraria alguém. O
 * cadastro pede o mínimo para a conta existir; isto aqui pede o pouco que faz
 * a nommi funcionar — e explica, enquanto pergunta, como as pessoas se acham.
 *
 * Três regras que não se mexem:
 *
 * 1. **Tudo é opcional.** Toda etapa tem "pular". Ninguém fica preso.
 * 2. **Nada de íntimo.** Não se pergunta estado civil, se tem filhos, religião,
 *    renda, nem nada que a pessoa não ofereceria no primeiro café.
 * 3. **A pessoa sabe o que é público.** Cada pergunta diz, na própria tela, se
 *    a resposta vai aparecer na página dela ou se serve só para melhorar as
 *    sugestões.
 */

export type Onde = "pagina" | "sugestao";

export type Etapa = {
  chave: "historia" | "procura" | "topa" | "naoTopa";
  campo: "about" | "looking_for" | "topa" | "nao_topa";
  titulo: string;
  ajuda: string;
  exemplo: string;
  max: number;
  linhas: number;
  onde: Onde;
};

export const ETAPAS: Etapa[] = [
  {
    chave: "historia",
    campo: "about",
    titulo: "Conta um pouco da sua história.",
    ajuda: "De onde você veio, o que você faz, o que anda te interessando. Do seu jeito.",
    exemplo: "Vim de Montes Claros faz seis anos, trabalho com gente, e ando aprendendo a cozinhar.",
    max: 600,
    linhas: 6,
    onde: "pagina",
  },
  {
    chave: "procura",
    campo: "looking_for",
    titulo: "Que amizades você quer encontrar por aqui?",
    ajuda: "Pode ser bem simples. É o que ajuda a gente a te mostrar para a pessoa certa.",
    exemplo: "Gente para sair num domingo sem precisar combinar com três semanas de antecedência.",
    max: 200,
    linhas: 3,
    onde: "pagina",
  },
  {
    chave: "topa",
    campo: "topa",
    titulo: "Qual rolê você topa na hora?",
    ajuda: "Aquele que, se te chamarem agora, você vai.",
    exemplo: "Qualquer coisa com música ao vivo e mesa na calçada.",
    max: 200,
    linhas: 2,
    onde: "pagina",
  },
  {
    chave: "naoTopa",
    campo: "nao_topa",
    titulo: "E qual não é a sua?",
    ajuda: "Serve para a gente não te chamar para o que você não gosta.",
    exemplo: "Balada que começa depois da meia-noite.",
    max: 200,
    linhas: 2,
    onde: "sugestao",
  },
];

/** O que fica na sua página e o que fica só com a nommi. */
export function recadoDaPrivacidade(onde: Onde): string {
  return onde === "pagina"
    ? "Isso aparece na sua página, para quem vê seu perfil."
    : "Isso não aparece na sua página. Fica só com a nommi, para melhorar o que te mostramos.";
}

/** Como as pessoas se encontram aqui. É o que faltou para a testadora. */
export const COMO_FUNCIONA = [
  {
    titulo: "Pelo que vocês gostam",
    texto:
      "Em Descobrir aparece gente com interesses parecidos com os seus. Quanto mais interesses você marca, melhor fica a fila. Quem você passa nunca fica sabendo.",
  },
  {
    titulo: "Pelas tribos",
    texto:
      "Tribo é um grupo com assunto: café, trilha, karaokê, o que for. Entrar numa tribo é o jeito mais rápido de começar a conversar, e não obriga a marcar nada.",
  },
  {
    titulo: "Pelos rolês, quando der vontade",
    texto:
      "Alguém propõe, quem quiser diz que vai. A nommi não organiza nada: quem combina são vocês.",
  },
];

export const TOTAL_DE_PASSOS = ETAPAS.length + 1;

/** Quanto já andou, de 0 a 100, para a barra de progresso. */
export function progresso(passo: number, total = TOTAL_DE_PASSOS): number {
  const t = Math.max(1, total);
  return Math.round((Math.min(Math.max(0, passo), t) / t) * 100);
}

export function limparResposta(bruto: string, max: number): string {
  return String(bruto ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim()
    .slice(0, Math.max(1, max));
}

/** O que vai para o banco: só os campos que a pessoa realmente respondeu. */
export function respostasParaSalvar(
  respostas: Partial<Record<Etapa["chave"], string>>,
): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const e of ETAPAS) {
    const v = limparResposta(respostas[e.chave] ?? "", e.max);
    if (v) saida[e.campo] = v;
  }
  return saida;
}

/** Respondeu alguma coisa, ou passou direto? */
export const respondeuAlgo = (respostas: Partial<Record<Etapa["chave"], string>>) =>
  Object.keys(respostasParaSalvar(respostas)).length > 0;

/** O fecho, que muda conforme o quanto a pessoa contou. */
export function recadoDoFim(respostas: Partial<Record<Etapa["chave"], string>>): string {
  const quantas = Object.keys(respostasParaSalvar(respostas)).length;
  if (quantas === 0)
    return "Sem problema nenhum. Você conta quando quiser, em Meu nommi, e isso melhora o que a gente te mostra.";
  if (quantas < ETAPAS.length)
    return "Já dá para começar. O resto você completa quando der vontade, em Meu nommi.";
  return "Pronto. Agora a gente consegue te mostrar gente que tem a ver com você.";
}
