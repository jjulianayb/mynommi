/**
 * Interesse vira figurinha. O nome continua sendo o dado guardado — a figurinha
 * é como ele aparece. Assim quem escreveu um interesse que não está na lista
 * não perde nada: ganha uma figurinha genérica e continua combinando.
 */

export type Figurinha = { nome: string; fig: string; grupo: string };

export const FIGURINHAS: Figurinha[] = [
  { nome: "café", fig: "☕", grupo: "Comer e beber" },
  { nome: "vinho", fig: "🍷", grupo: "Comer e beber" },
  { nome: "cerveja", fig: "🍺", grupo: "Comer e beber" },
  { nome: "churrasco", fig: "🔥", grupo: "Comer e beber" },
  { nome: "culinária", fig: "🍳", grupo: "Comer e beber" },
  { nome: "feira", fig: "🥬", grupo: "Comer e beber" },
  { nome: "doces", fig: "🍰", grupo: "Comer e beber" },

  { nome: "cinema", fig: "🎬", grupo: "Arte e cultura" },
  { nome: "séries", fig: "📺", grupo: "Arte e cultura" },
  { nome: "música", fig: "🎵", grupo: "Arte e cultura" },
  { nome: "shows", fig: "🎤", grupo: "Arte e cultura" },
  { nome: "teatro", fig: "🎭", grupo: "Arte e cultura" },
  { nome: "livros", fig: "📚", grupo: "Arte e cultura" },
  { nome: "arte", fig: "🎨", grupo: "Arte e cultura" },
  { nome: "fotografia", fig: "📷", grupo: "Arte e cultura" },
  { nome: "dança", fig: "💃", grupo: "Arte e cultura" },
  { nome: "karaokê", fig: "🎙️", grupo: "Arte e cultura" },
  { nome: "museus", fig: "🏛️", grupo: "Arte e cultura" },

  { nome: "caminhada", fig: "🚶", grupo: "Corpo e ar livre" },
  { nome: "corrida", fig: "🏃", grupo: "Corpo e ar livre" },
  { nome: "trilhas", fig: "🥾", grupo: "Corpo e ar livre" },
  { nome: "ciclismo", fig: "🚲", grupo: "Corpo e ar livre" },
  { nome: "academia", fig: "🏋️", grupo: "Corpo e ar livre" },
  { nome: "yoga", fig: "🧘", grupo: "Corpo e ar livre" },
  { nome: "natureza", fig: "🌳", grupo: "Corpo e ar livre" },
  { nome: "praia", fig: "🏖️", grupo: "Corpo e ar livre" },
  { nome: "futebol", fig: "⚽", grupo: "Corpo e ar livre" },
  { nome: "vôlei", fig: "🏐", grupo: "Corpo e ar livre" },
  { nome: "pedal", fig: "🚴", grupo: "Corpo e ar livre" },

  { nome: "viagens", fig: "✈️", grupo: "Vida" },
  { nome: "pets", fig: "🐾", grupo: "Vida" },
  { nome: "maternidade", fig: "🍼", grupo: "Vida" },
  { nome: "voluntariado", fig: "🤝", grupo: "Vida" },
  { nome: "espiritualidade", fig: "🕊️", grupo: "Vida" },
  { nome: "jardinagem", fig: "🪴", grupo: "Vida" },
  { nome: "idiomas", fig: "🗣️", grupo: "Vida" },
  { nome: "empreender", fig: "💡", grupo: "Vida" },

  { nome: "games", fig: "🎮", grupo: "Em casa" },
  { nome: "jogos de mesa", fig: "🎲", grupo: "Em casa" },
  { nome: "tecnologia", fig: "💻", grupo: "Em casa" },
  { nome: "podcasts", fig: "🎧", grupo: "Em casa" },
  { nome: "artesanato", fig: "🧶", grupo: "Em casa" },
];

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const PORCHAVE = new Map(FIGURINHAS.map((f) => [semAcento(f.nome), f.fig]));

/** Palavras soltas que aparecem em interesse escrito à mão. */
const PISTAS: [string, string][] = [
  ["cafe", "☕"],
  ["vinho", "🍷"],
  ["cerveja", "🍺"],
  ["bar", "🍻"],
  ["cinema", "🎬"],
  ["filme", "🎬"],
  ["serie", "📺"],
  ["music", "🎵"],
  ["show", "🎤"],
  ["cant", "🎤"],
  ["livro", "📚"],
  ["leitura", "📚"],
  ["ler", "📚"],
  ["arte", "🎨"],
  ["foto", "📷"],
  ["danc", "💃"],
  ["corr", "🏃"],
  ["caminh", "🚶"],
  ["trilha", "🥾"],
  ["bike", "🚲"],
  ["ciclis", "🚲"],
  ["pedal", "🚴"],
  ["academia", "🏋️"],
  ["muscula", "🏋️"],
  ["yoga", "🧘"],
  ["medita", "🧘"],
  ["praia", "🏖️"],
  ["natureza", "🌳"],
  ["plant", "🪴"],
  ["pet", "🐾"],
  ["cachorro", "🐕"],
  ["gato", "🐈"],
  ["viag", "✈️"],
  ["jogo", "🎲"],
  ["game", "🎮"],
  ["culin", "🍳"],
  ["cozinh", "🍳"],
  ["comida", "🍽️"],
  ["doce", "🍰"],
  ["futebol", "⚽"],
  ["volei", "🏐"],
  ["teatro", "🎭"],
  ["museu", "🏛️"],
  ["igreja", "🕊️"],
  ["fe", "🕊️"],
  ["filho", "🍼"],
  ["mae", "🍼"],
  ["materni", "🍼"],
  ["volunt", "🤝"],
  ["idioma", "🗣️"],
  ["ingles", "🗣️"],
  ["tecnolog", "💻"],
  ["podcast", "🎧"],
  ["croche", "🧶"],
  ["tricot", "🧶"],
  ["feira", "🥬"],
  ["churras", "🔥"],
];

/** A figurinha de um interesse. Sempre devolve alguma coisa. */
export function figurinhaDe(interesse: string): string {
  const chave = semAcento(interesse);
  const exata = PORCHAVE.get(chave);
  if (exata) return exata;
  for (const [pista, fig] of PISTAS) if (chave.includes(pista)) return fig;
  return "✨";
}

export const gruposDeFigurinhas = (): string[] => [...new Set(FIGURINHAS.map((f) => f.grupo))];

export const figurinhasDoGrupo = (grupo: string): Figurinha[] =>
  FIGURINHAS.filter((f) => f.grupo === grupo);

/** Busca por nome, sem acento e sem caixa, para o campo de procurar interesse. */
export function procurarFigurinhas(termo: string): Figurinha[] {
  const t = semAcento(termo);
  if (!t) return FIGURINHAS;
  return FIGURINHAS.filter((f) => semAcento(f.nome).includes(t));
}

/** Dois interesses são o mesmo se o nome bate sem acento e sem maiúscula. */
export const mesmoInteresse = (a: string, b: string) => semAcento(a) === semAcento(b);
