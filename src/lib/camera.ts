/**
 * A câmera do story. Story é o que está acontecendo agora: abre a câmera,
 * filtra ao vivo, tira e publica. Nada de procurar foto antiga na galeria.
 */

export type Filtro = { id: string; nome: string; css: string; grupo: "Beleza" | "Divertido" };

export const FILTROS: Filtro[] = [
  { id: "natural", nome: "Natural", css: "none", grupo: "Beleza" },
  {
    id: "suave",
    nome: "Suave",
    css: "brightness(1.06) saturate(1.05) contrast(1.02) blur(0.4px)",
    grupo: "Beleza",
  },
  { id: "luz", nome: "Luz", css: "brightness(1.14) contrast(1.06)", grupo: "Beleza" },
  {
    id: "pessego",
    nome: "Pêssego",
    css: "sepia(0.18) saturate(1.25) brightness(1.08)",
    grupo: "Beleza",
  },
  {
    id: "vico",
    nome: "Viço",
    css: "saturate(1.4) contrast(1.05) brightness(1.03)",
    grupo: "Beleza",
  },
  { id: "pb", nome: "Preto e branco", css: "grayscale(1) contrast(1.12)", grupo: "Divertido" },
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
  const w = video.videoWidth;
  const h = video.videoHeight;
  ctx.save();
  if (espelhar) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  const css = filtroCss(filtro);
  if (css !== "none" && "filter" in ctx) ctx.filter = css;
  ctx.drawImage(video as unknown as CanvasImageSource, 0, 0, w, h);
  ctx.restore();
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
