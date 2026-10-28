/**
 * Recortar a foto na hora, dentro do app.
 * A conta vive aqui porque é ela que faz a foto não "pular" ao arrastar:
 * a imagem nunca pode deixar aparecer buraco dentro da moldura.
 */

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 3;

export const limitarZoom = (z: number) =>
  Number.isFinite(z) ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)) : ZOOM_MIN;

/** O tamanho que a imagem ocupa na moldura antes do zoom: sempre cobrindo. */
export function escalaQueCobre(largura: number, altura: number, quadro: number): number {
  const l = Math.max(1, largura);
  const a = Math.max(1, altura);
  return quadro / Math.min(l, a);
}

/**
 * Quanto a imagem pode andar para cada lado sem abrir buraco.
 * Com zoom 1 numa foto quadrada, não anda nada — e está certo.
 */
export function folga(largura: number, altura: number, quadro: number, zoom: number) {
  const e = escalaQueCobre(largura, altura, quadro) * limitarZoom(zoom);
  return {
    x: Math.max(0, (largura * e - quadro) / 2),
    y: Math.max(0, (altura * e - quadro) / 2),
  };
}

export function prenderNaMoldura(
  deslocamento: { x: number; y: number },
  largura: number,
  altura: number,
  quadro: number,
  zoom: number,
): { x: number; y: number } {
  const f = folga(largura, altura, quadro, zoom);
  // o "|| 0" existe para -0 não vazar para a tela nem para os testes
  const prender = (v: number, limite: number) =>
    !Number.isFinite(v) ? 0 : Math.min(limite, Math.max(-limite, v)) || 0;
  return { x: prender(deslocamento.x, f.x), y: prender(deslocamento.y, f.y) };
}

/**
 * O pedaço da foto original que vai virar o arquivo final.
 * Devolve em coordenadas da imagem, prontas para o drawImage.
 */
export function pedacoDaFoto(
  largura: number,
  altura: number,
  quadro: number,
  zoom: number,
  deslocamento: { x: number; y: number },
): { sx: number; sy: number; s: number } {
  const e = escalaQueCobre(largura, altura, quadro) * limitarZoom(zoom);
  const s = quadro / e; // lado do recorte, em pixels da imagem
  const centroX = largura / 2 - deslocamento.x / e;
  const centroY = altura / 2 - deslocamento.y / e;
  const sx = Math.min(Math.max(0, centroX - s / 2), Math.max(0, largura - s));
  const sy = Math.min(Math.max(0, centroY - s / 2), Math.max(0, altura - s));
  return { sx, sy, s };
}

/** Passo a passo do envio, em palavras que a pessoa entende. */
export function recadoDoEnvio(fase: "indo" | "pronto" | "erro"): string {
  if (fase === "indo") return "Mandando sua foto…";
  if (fase === "pronto") return "Foto trocada.";
  return "A foto apareceu aqui, mas não subiu. Toque para tentar de novo.";
}
