/**
 * A câmera do story. Story é o que está acontecendo agora: abre a câmera,
 * filtra ao vivo, tira e publica. Nada de procurar foto antiga na galeria.
 */

/**
 * `suavidade` é a parte que o CSS não faz: entra no canvas, na hora de tirar,
 * pela conta de `src/lib/beleza.ts`. Desfoque de CSS borraria olho e boca
 * junto, que é exatamente o que dá cara de filtro ruim.
 */
export type Filtro = {
  id: string;
  nome: string;
  css: string;
  grupo: "Beleza" | "Divertido";
  suavidade?: number;
};

export const FILTROS: Filtro[] = [
  { id: "natural", nome: "Natural", css: "none", grupo: "Beleza" },
  {
    id: "suave",
    nome: "Suave",
    css: "brightness(1.05) saturate(1.04) contrast(1.02)",
    grupo: "Beleza",
    suavidade: 45,
  },
  {
    id: "luz",
    nome: "Luz",
    css: "brightness(1.14) contrast(1.05)",
    grupo: "Beleza",
    suavidade: 25,
  },
  {
    id: "pessego",
    nome: "Pêssego",
    css: "sepia(0.16) saturate(1.22) brightness(1.07)",
    grupo: "Beleza",
    suavidade: 40,
  },
  {
    id: "vico",
    nome: "Viço",
    css: "saturate(1.35) contrast(1.05) brightness(1.03)",
    grupo: "Beleza",
    suavidade: 20,
  },
  {
    id: "porcelana",
    nome: "Porcelana",
    css: "brightness(1.08) contrast(0.97) saturate(0.97)",
    grupo: "Beleza",
    suavidade: 78,
  },
  {
    id: "dourado",
    nome: "Fim de tarde",
    css: "sepia(0.28) saturate(1.3) brightness(1.06) contrast(1.03)",
    grupo: "Beleza",
    suavidade: 35,
  },
  {
    id: "rose",
    nome: "Rosé",
    css: "sepia(0.12) saturate(1.3) hue-rotate(-8deg) brightness(1.06)",
    grupo: "Beleza",
    suavidade: 42,
  },
  {
    id: "bronze",
    nome: "Bronze",
    css: "sepia(0.3) saturate(1.35) contrast(1.06) brightness(1.02)",
    grupo: "Beleza",
    suavidade: 30,
  },
  {
    id: "noite",
    nome: "Noite",
    css: "brightness(1.2) contrast(1.12) saturate(1.1)",
    grupo: "Beleza",
    suavidade: 55,
  },
  { id: "pb", nome: "Preto e branco", css: "grayscale(1) contrast(1.12)", grupo: "Divertido" },
  {
    id: "filme",
    nome: "Filme",
    css: "sepia(0.22) contrast(1.16) saturate(0.9)",
    grupo: "Divertido",
  },
  {
    id: "neon",
    nome: "Neon",
    css: "saturate(2) contrast(1.2) hue-rotate(15deg)",
    grupo: "Divertido",
  },
  {
    id: "vhs",
    nome: "VHS",
    css: "saturate(1.7) hue-rotate(-10deg) contrast(1.22)",
    grupo: "Divertido",
  },
  {
    id: "vintage",
    nome: "Vintage",
    css: "sepia(0.5) contrast(0.95) brightness(1.05)",
    grupo: "Divertido",
  },
  { id: "frio", nome: "Frio", css: "hue-rotate(190deg) saturate(1.25)", grupo: "Divertido" },
  {
    id: "mata",
    nome: "Mata",
    css: "sepia(0.35) hue-rotate(70deg) saturate(1.6)",
    grupo: "Divertido",
  },
  {
    id: "brasa",
    nome: "Brasa",
    css: "sepia(0.4) hue-rotate(-20deg) saturate(2) contrast(1.1)",
    grupo: "Divertido",
  },
  { id: "negativo", nome: "Negativo", css: "invert(1)", grupo: "Divertido" },
];

export const FILTRO_PADRAO = "natural";

export const filtroPorId = (id: string): Filtro => FILTROS.find((f) => f.id === id) ?? FILTROS[0]!;

/** O que vai para o estilo da prévia e para o canvas. Nunca texto solto. */
export const filtroCss = (id: string): string => filtroPorId(id).css;

/** Quanta pele suave o filtro pede. Zero para os divertidos. */
export const suavidadeDoFiltro = (id: string): number => filtroPorId(id).suavidade ?? 0;

export const gruposDeFiltro = (): ("Beleza" | "Divertido")[] => ["Beleza", "Divertido"];
export const filtrosDoGrupo = (g: "Beleza" | "Divertido") => FILTROS.filter((f) => f.grupo === g);

/** Story some em uma hora: é o que está acontecendo agora, não o álbum da semana. */
export const HORAS_NO_AR = 1;
export const venceEm = (agora = new Date()): string =>
  new Date(agora.getTime() + HORAS_NO_AR * 3600_000).toISOString();

/** Quanto falta, em palavras curtas. */
export function quantoFalta(expiraEm: string, agora = Date.now()): string {
  const min = Math.round((new Date(expiraEm).getTime() - agora) / 60000);
  if (min <= 0) return "acabou";
  if (min === 1) return "some em 1 min";
  if (min < 60) return `some em ${min} min`;
  return "some em 1 h";
}

/**
 * Desenha o quadro do vídeo no canvas já com o filtro e o espelho.
 * Espelhar é só para a câmera da frente: a pessoa se vê como no espelho,
 * mas a foto sai do jeito que os outros veem.
 */
export function desenharQuadro(
  ctx: CanvasRenderingContext2D,
  video: { videoWidth: number; videoHeight: number },
  filtro: string,
  espelhar: boolean,
): void {
  desenharFonte(
    ctx,
    video as unknown as CanvasImageSource,
    video.videoWidth,
    video.videoHeight,
    filtroCss(filtro),
    espelhar,
  );
}

/**
 * O mesmo desenho, para qualquer origem: a câmera ao vivo ou uma foto da
 * galeria. Quem vem da galeria nunca é espelhado, porque não é um reflexo.
 */
export function desenharFonte(
  ctx: CanvasRenderingContext2D,
  fonte: CanvasImageSource,
  w: number,
  h: number,
  css: string,
  espelhar: boolean,
): void {
  ctx.save();
  if (espelhar) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  if (css && css !== "none" && "filter" in ctx) ctx.filter = css;
  ctx.drawImage(fonte, 0, 0, w, h);
  ctx.restore();
}

/** O nome do arquivo quando a pessoa baixa o story para usar em outra rede. */
export function nomeDoStory(agora = new Date()): string {
  const d = agora.toISOString().slice(0, 16).replace("T", "-").replace(":", "h");
  return `nommi-${d}.jpg`;
}

/** Recorte em pé, como o story é visto. Devolve o tamanho do canvas. */
export function tamanhoDoStory(
  largura: number,
  altura: number,
  max = 1280,
): { w: number; h: number } {
  const l = Math.max(1, largura);
  const a = Math.max(1, altura);
  const escala = Math.min(1, max / Math.max(l, a));
  return { w: Math.round(l * escala), h: Math.round(a * escala) };
}

/** Quanto tempo o story de vídeo pode ter. Mais que isso ninguém assiste. */
export const SEGUNDOS_DE_VIDEO = 20;

/**
 * O formato que o próprio navegador grava é o formato que ele sabe tocar.
 * Por isso o vídeo do story é gravado aqui, e não trazido da galeria:
 * vídeo de iPhone vem em .mov e não abre no Android.
 */
export function formatoDeGravacao(
  suportado: (t: string) => boolean = (t) =>
    typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t),
): string | null {
  for (const t of ["video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"])
    if (suportado(t)) return t;
  return null;
}

export const extensaoDoVideo = (tipo: string) => (tipo.startsWith("video/mp4") ? "mp4" : "webm");

/** O quanto já gravou, em palavras, e se já deu o tempo. */
export function contagemDaGravacao(ms: number, limite = SEGUNDOS_DE_VIDEO) {
  const seg = Math.min(limite, Math.floor(ms / 1000));
  return { texto: `0:${String(seg).padStart(2, "0")}`, acabou: seg >= limite };
}
