/**
 * O tour: balões que apontam para a tela de verdade e explicam o que é cada coisa.
 * A régua aqui é só uma: ninguém pode ficar preso. Pular está sempre à mão,
 * e passo que aponta para algo que não está na tela é passo que não existe.
 */

export type PassoDoTour = {
  id: string;
  alvo: string;
  titulo: string;
  texto: string;
  /** Onde o balão prefere ficar quando há espaço dos dois lados. */
  preferido?: "acima" | "abaixo";
};

export const PASSOS_DO_TOUR: PassoDoTour[] = [
  {
    id: "pessoas",
    alvo: '[data-tour="pessoas"]',
    titulo: "Gente para você conhecer",
    texto:
      "Estes são os rostos de quem está na nommi perto de você. Embaixo de cada um aparece o que vocês dois gostam.",
    preferido: "abaixo",
  },
  {
    id: "descobrir",
    alvo: '[data-tour="descobrir"]',
    titulo: "Aqui acontece o match",
    texto:
      "Você vê uma pessoa por vez, com os interesses dela. Diz se quer conhecer ou passa. Se os dois quiserem, viram amizade na hora.",
    preferido: "acima",
  },
  {
    id: "criar",
    alvo: '[data-tour="criar"]',
    titulo: "O botão do meio",
    texto: "É por aqui que você publica um momento, cria uma tribo ou marca um rolê.",
    preferido: "acima",
  },
  {
    id: "tribos",
    alvo: '[data-tour="tribos"]',
    titulo: "Suas tribos",
    texto:
      "Tribo é o grupo que se encontra de verdade: caminhada, vinho, cinema. Dentro dela tem conversa que só quem está lá vê.",
    preferido: "acima",
  },
  {
    id: "conversas",
    alvo: '[data-tour="conversas"]',
    titulo: "Suas conversas",
    texto: "Depois do match, a conversa abre aqui. Só com quem já é sua amizade.",
    preferido: "abaixo",
  },
  {
    id: "meu-nommi",
    alvo: '[data-tour="meu-nommi"]',
    titulo: "Sua página",
    texto:
      "É por ela que alguém decide se quer te conhecer. Coloque sua foto, sua capa e o que você está procurando.",
    preferido: "acima",
  },
];

export type Caixa = { top: number; left: number; width: number; height: number };
export type Tela = { largura: number; altura: number };
export type Balao = { largura: number; altura: number };
export type Posicao = { top: number; left: number; lado: "acima" | "abaixo" };

/**
 * Onde o balão cabe. Vai para baixo do alvo quando há espaço, senão para cima,
 * e nunca encosta na borda da tela.
 */
export function posicaoDoBalao(
  alvo: Caixa,
  tela: Tela,
  balao: Balao,
  preferido: "acima" | "abaixo" = "abaixo",
  margem = 12,
): Posicao {
  const cabeAbaixo = alvo.top + alvo.height + margem + balao.altura <= tela.altura - margem;
  const cabeAcima = alvo.top - margem - balao.altura >= margem;
  let lado: "acima" | "abaixo";
  if (preferido === "abaixo") lado = cabeAbaixo || !cabeAcima ? "abaixo" : "acima";
  else lado = cabeAcima || !cabeAbaixo ? "acima" : "abaixo";

  const centro = alvo.left + alvo.width / 2 - balao.largura / 2;
  const left = Math.min(
    Math.max(margem, centro),
    Math.max(margem, tela.largura - balao.largura - margem),
  );
  const brutoTop =
    lado === "abaixo" ? alvo.top + alvo.height + margem : alvo.top - balao.altura - margem;
  const top = Math.min(
    Math.max(margem, brutoTop),
    Math.max(margem, tela.altura - balao.altura - margem),
  );
  return { top, left, lado };
}

/** Passo que aponta para algo que não está na tela é pulado, não mostrado vazio. */
export function passosVisiveis(
  passos: PassoDoTour[],
  existe: (alvo: string) => boolean,
): PassoDoTour[] {
  return passos.filter((p) => existe(p.alvo));
}

/** O recorte do holofote, com uma folga em volta do alvo. */
export function recorte(alvo: Caixa, folga = 8): Caixa {
  return {
    top: alvo.top - folga,
    left: alvo.left - folga,
    width: alvo.width + folga * 2,
    height: alvo.height + folga * 2,
  };
}

const chave = (userId: string) => "nommi-tour-visto-" + userId;

export function tourJaVisto(userId: string | null): boolean {
  if (!userId || typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(chave(userId)) === "1";
  } catch {
    return true;
  }
}

export function marcarTourVisto(userId: string): void {
  try {
    window.localStorage.setItem(chave(userId), "1");
  } catch {
    /* sem armazenamento: o tour volta na próxima visita, e tudo bem */
  }
}

export function esquecerTour(userId: string): void {
  try {
    window.localStorage.removeItem(chave(userId));
  } catch {
    /* idem */
  }
}
