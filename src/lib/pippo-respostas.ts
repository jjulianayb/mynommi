/**
 * O Pippo responde com texto escrito pela nommi, sem IA e sem custo por mensagem.
 * Cada resposta repete o que o app já diz em outra tela; se uma regra mudar lá,
 * muda aqui. O que não existe no app não entra: quando ele não sabe, diz que não sabe.
 */
import { MATCHES_GRATIS, PERFIS_GRATIS_POR_DIA, PERFIS_PRO_POR_DIA, TRIBOS_PRO } from "./plano";

export type RespostaDoPippo = {
  id: string;
  pergunta: string;
  resposta: string;
  /** Palavras que levam a esta resposta quando a pessoa escreve livre (sem acento). */
  palavras: string[];
  /** Abertura curta e leve, antes da resposta. */
  abre: string;
  /** Perguntas que fazem sentido logo depois desta. */
  depois: string[];
  ir?: {
    to: "/descobrir" | "/grupos" | "/perfil" | "/convites" | "/convidar" | "/ajuda";
    rotulo: string;
  };
};

export const RESPOSTAS_DO_PIPPO: RespostaDoPippo[] = [
  {
    id: "match",
    abre: "Essa eu sei de olho fechado.",
    depois: ["limite", "pagina", "tribo"],
    pergunta: "Como funciona o match?",
    resposta:
      "Você vê uma pessoa por vez, com os interesses dela. Diz se quer conhecer ou passa. Se os dois quiserem, viram amizade na hora e a conversa abre.",
    palavras: ["match", "curtir", "conhecer", "descobrir", "amizade", "passar"],
    ir: { to: "/descobrir", rotulo: "Ir para Descobrir" },
  },
  {
    id: "limite",
    abre: "Boa, vamos de conta rápida.",
    depois: ["match", "criar-tribo", "tribo"],
    pergunta: "Quantas pessoas vejo por dia?",
    resposta: `No plano grátis são ${PERFIS_GRATIS_POR_DIA} apresentações por dia e até ${MATCHES_GRATIS} matches. No Pro são ${PERFIS_PRO_POR_DIA} por dia e o match não tem teto. Amanhã vem gente nova.`,
    palavras: ["dia", "quantas", "limite", "acabou", "acabaram", "gratis", "pro", "teto", "plano"],
  },
  {
    id: "tribo",
    abre: "Tribo é a minha parte favorita.",
    depois: ["entrar", "segredo", "role"],
    pergunta: "O que é uma tribo?",
    resposta:
      "Tribo é gente com algo em comum: café, trilha, jogos, maternidade. Você entra pelo interesse, não por estar sozinha. Dentro dela tem conversa que só quem está lá vê.",
    palavras: ["tribo", "tribos", "grupo", "grupos", "comunidade"],
    ir: { to: "/grupos", rotulo: "Ver as tribos" },
  },
  {
    id: "entrar",
    abre: "Fácil, é um toque só.",
    depois: ["segredo", "role", "criar-tribo"],
    pergunta: "Como entro numa tribo?",
    resposta:
      "Abra Tribos, escolha uma das abertas e toque em Entrar. Sair também é simples, é só tocar em Sair.",
    palavras: ["entrar", "entro", "participar", "sair", "entro numa", "entrar numa", "entrar na"],
    ir: { to: "/grupos", rotulo: "Ver as tribos" },
  },
  {
    id: "segredo",
    abre: "Aqui é cofre, ninguém fala.",
    depois: ["tribo", "role", "convidar"],
    pergunta: "O que é o “Só entre nós”?",
    resposta:
      "Cada tribo tem um espaço onde o que se escreve some sozinho e não sai do grupo. Só quem está na tribo vê.",
    palavras: ["segredo", "secreto", "sumir", "some", "privado", "entre nos", "so entre"],
  },
  {
    id: "role",
    abre: "Sextou mesmo, né?",
    depois: ["convidar", "entrar", "pagina"],
    pergunta: "Como marco um rolê?",
    resposta:
      "Alguém abre um rolê com dia, lugar e vagas, e quem quiser diz “Quero ir”. É opcional. Para abrir um, toque no botão do meio e escolha “Criar rolê aberto”.",
    palavras: ["role", "roles", "encontro", "marcar", "evento", "quero ir"],
    ir: { to: "/convites", rotulo: "Ver rolês abertos" },
  },
  {
    id: "convidar",
    abre: "Quanto mais gente boa, melhor.",
    depois: ["role", "pagina", "tribo"],
    pergunta: "Como chamo alguém para a nommi?",
    resposta: "Toque no botão do meio e escolha “Chamar minha tribo”. Você manda o convite por lá.",
    palavras: ["convidar", "convite", "chamar", "chamo", "alguem", "amiga", "amigo", "indicar"],
    ir: { to: "/convidar", rotulo: "Chamar minha tribo" },
  },
  {
    id: "pagina",
    abre: "Capricha que a primeira impressão conta.",
    depois: ["match", "tribo", "limite"],
    pergunta: "Como deixo minha página mais atraente?",
    resposta:
      "Em Meu nommi, coloque sua foto, sua capa, seus interesses e o que você está procurando. É por ela que alguém decide se quer te conhecer.",
    palavras: ["pagina", "perfil", "foto", "capa", "interesses", "bio", "editar"],
    ir: { to: "/perfil", rotulo: "Abrir Meu nommi" },
  },
  {
    id: "criar-tribo",
    abre: "Já pensando em fundar a sua?",
    depois: ["tribo", "entrar", "limite"],
    pergunta: "Posso criar uma tribo?",
    resposta: `Quem tem Pro pode criar até ${TRIBOS_PRO} tribos. No plano grátis você pode entrar em todas as tribos abertas.`,
    palavras: ["criar", "crio", "nova tribo", "fundar", "criar uma", "posso criar"],
  },
];

export const BOAS_VINDAS_DO_PIPPO = [
  "Oi! Pippo na área.",
  "Te ajudo a se achar na nommi. Toca numa sugestão ou escreve a sua dúvida.",
];

/** As três sugestões do começo da conversa. */
export const COMECO_DO_PIPPO = ["match", "tribo", "limite"];

export const NAO_SEI_DO_PIPPO = [
  "Essa me pegou.",
  "Ainda não sei responder isso. Dá uma olhada na Ajuda, que lá tem mais.",
];

/** Conversa fiada: respostas curtas para quem só quer dar um oi. */
const PAPO: { palavras: string[]; baloes: string[] }[] = [
  {
    palavras: ["oi", "ola", "bom dia", "boa tarde", "boa noite", "eai", "opa"],
    baloes: [
      "Opa, que bom te ver por aqui!",
      "Quer saber como a nommi funciona? É só tocar numa sugestão.",
    ],
  },
  {
    palavras: ["obrigado", "obrigada", "valeu", "brigado", "brigada"],
    baloes: ["Imagina, é meu trabalho e meu hobby.", "Qualquer coisa, é só chamar."],
  },
  { palavras: ["tchau", "ate mais", "flw", "falou"], baloes: ["Até mais! Vai lá fazer amizade."] },
  {
    palavras: ["quem e voce", "quem e vc", "quem voce e", "seu nome", "pippo"],
    baloes: [
      "Sou o Pippo, o ajudante da nommi.",
      "Respondo o que o app já sabe. O resto eu admito que não sei.",
    ],
  },
  {
    palavras: ["robo", "ia", "inteligencia artificial", "chatgpt"],
    baloes: [
      "Sou um ajudante de respostas prontas, escritas pela nommi.",
      "Não invento nada, só repito o que o app diz.",
    ],
  },
];

export function papoPara(texto: string): string[] | null {
  const t = " " + limpa(texto) + " ";
  for (const p of PAPO) if (p.palavras.some((w) => t.includes(" " + w + " "))) return p.baloes;
  return null;
}

/** Quebra um texto em balões curtos, por frase, sem passar de ~110 caracteres cada. */
export function baloes(texto: string, max = 110): string[] {
  const frases = texto.match(/[^.!?]+[.!?]+["”]?|[^.!?]+$/g)?.map((f) => f.trim()) ?? [texto];
  const out: string[] = [];
  for (const f of frases) {
    const ult = out[out.length - 1];
    if (ult && (ult + " " + f).length <= max) out[out.length - 1] = ult + " " + f;
    else out.push(f);
  }
  return out;
}

export const respostaPorId = (id: string) => RESPOSTAS_DO_PIPPO.find((r) => r.id === id) ?? null;

const limpa = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** A resposta mais parecida com o que a pessoa escreveu, ou null se nada bate. */
export function respostaPara(texto: string): RespostaDoPippo | null {
  const t = " " + limpa(texto) + " ";
  if (t.trim().length < 2) return null;
  let melhor: RespostaDoPippo | null = null;
  let pontos = 0;
  for (const r of RESPOSTAS_DO_PIPPO) {
    let p = 0;
    for (const w of r.palavras) {
      if (t.includes(" " + w + " ") || (w.length >= 5 && t.includes(" " + w)))
        p += w.includes(" ") ? 2 : 1;
    }
    if (p > pontos) {
      pontos = p;
      melhor = r;
    }
  }
  return melhor;
}
