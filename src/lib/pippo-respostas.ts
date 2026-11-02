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
  ir?: {
    to: "/descobrir" | "/grupos" | "/perfil" | "/convites" | "/convidar" | "/ajuda";
    rotulo: string;
  };
};

export const RESPOSTAS_DO_PIPPO: RespostaDoPippo[] = [
  {
    id: "match",
    pergunta: "Como funciona o match?",
    resposta:
      "Você vê uma pessoa por vez, com os interesses dela. Diz se quer conhecer ou passa. Se os dois quiserem, viram amizade na hora e a conversa abre.",
    palavras: ["match", "curtir", "conhecer", "descobrir", "amizade", "passar"],
    ir: { to: "/descobrir", rotulo: "Ir para Descobrir" },
  },
  {
    id: "limite",
    pergunta: "Quantas pessoas vejo por dia?",
    resposta: `No plano grátis são ${PERFIS_GRATIS_POR_DIA} apresentações por dia e até ${MATCHES_GRATIS} matches. No Pro são ${PERFIS_PRO_POR_DIA} por dia e o match não tem teto. Amanhã vem gente nova.`,
    palavras: ["dia", "quantas", "limite", "acabou", "acabaram", "gratis", "pro", "teto", "plano"],
  },
  {
    id: "tribo",
    pergunta: "O que é uma tribo?",
    resposta:
      "Tribo é gente com algo em comum: café, trilha, jogos, maternidade. Você entra pelo interesse, não por estar sozinha. Dentro dela tem conversa que só quem está lá vê.",
    palavras: ["tribo", "tribos", "grupo", "grupos", "comunidade"],
    ir: { to: "/grupos", rotulo: "Ver as tribos" },
  },
  {
    id: "entrar",
    pergunta: "Como entro numa tribo?",
    resposta:
      "Abra Tribos, escolha uma das abertas e toque em Entrar. Sair também é simples, é só tocar em Sair.",
    palavras: ["entrar", "entro", "participar", "sair", "entro numa", "entrar numa", "entrar na"],
    ir: { to: "/grupos", rotulo: "Ver as tribos" },
  },
  {
    id: "segredo",
    pergunta: "O que é o “Só entre nós”?",
    resposta:
      "Cada tribo tem um espaço onde o que se escreve some sozinho e não sai do grupo. Só quem está na tribo vê.",
    palavras: ["segredo", "secreto", "sumir", "some", "privado", "entre nos", "so entre"],
  },
  {
    id: "role",
    pergunta: "Como marco um rolê?",
    resposta:
      "Alguém abre um rolê com dia, lugar e vagas, e quem quiser diz “Quero ir”. É opcional. Para abrir um, toque no botão do meio e escolha “Criar rolê aberto”.",
    palavras: ["role", "roles", "encontro", "marcar", "evento", "quero ir"],
    ir: { to: "/convites", rotulo: "Ver rolês abertos" },
  },
  {
    id: "convidar",
    pergunta: "Como chamo alguém para a nommi?",
    resposta: "Toque no botão do meio e escolha “Chamar minha tribo”. Você manda o convite por lá.",
    palavras: ["convidar", "convite", "chamar", "chamo", "alguem", "amiga", "amigo", "indicar"],
    ir: { to: "/convidar", rotulo: "Chamar minha tribo" },
  },
  {
    id: "pagina",
    pergunta: "Como deixo minha página mais atraente?",
    resposta:
      "Em Meu nommi, coloque sua foto, sua capa, seus interesses e o que você está procurando. É por ela que alguém decide se quer te conhecer.",
    palavras: ["pagina", "perfil", "foto", "capa", "interesses", "bio", "editar"],
    ir: { to: "/perfil", rotulo: "Abrir Meu nommi" },
  },
  {
    id: "criar-tribo",
    pergunta: "Posso criar uma tribo?",
    resposta: `Quem tem Pro pode criar até ${TRIBOS_PRO} tribos. No plano grátis você pode entrar em todas as tribos abertas.`,
    palavras: ["criar", "crio", "nova tribo", "fundar", "criar uma", "posso criar"],
  },
];

export const BOAS_VINDAS_DO_PIPPO =
  "Oi, eu sou o Pippo. Te ajudo a se achar na nommi. Toque numa pergunta ou escreva a sua.";

export const NAO_SEI_DO_PIPPO =
  "Essa eu ainda não sei responder. Dá uma olhada na Ajuda, que lá tem mais.";

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
