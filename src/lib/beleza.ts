/**
 * Beleza: a parte dos filtros que mexe na pele e na cor.
 *
 * Duas coisas diferentes moram aqui.
 *
 * A primeira é cor e luz, que o navegador faz sozinho com `filter` de CSS:
 * é instantâneo e serve para a prévia ao vivo.
 *
 * A segunda é a suavidade da pele, que CSS nenhum faz direito. Desfoque puro
 * borra tudo: olho, cílio, boca, contorno. O que deixa a pele bonita sem
 * deixar a cara de boneca é borrar **só onde não tem detalhe**. Por isso a
 * mistura abaixo compara cada ponto da foto com a versão borrada e só troca
 * pelo borrado quando os dois já eram parecidos. Onde há detalhe de verdade,
 * a foto original fica intacta.
 *
 * Nada de CSS entra aqui de fora: o texto do filtro é montado a partir de
 * números conferidos, nunca de texto digitado.
 */

export type Ajustes = {
  luz: number;
  contraste: number;
  calor: number;
  vico: number;
  suavidade: number;
};

/** Tudo em zero é a foto como a câmera viu. */
export const AJUSTES_PADRAO: Ajustes = { luz: 0, contraste: 0, calor: 0, vico: 0, suavidade: 0 };

export const LIMITES: Record<keyof Ajustes, { min: number; max: number }> = {
  luz: { min: -50, max: 50 },
  contraste: { min: -50, max: 50 },
  calor: { min: -50, max: 50 },
  vico: { min: -50, max: 50 },
  suavidade: { min: 0, max: 100 },
};

const prender = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(Number.isFinite(n) ? n : 0)));

/** Só números, dentro do limite. É o portão: nada que não seja número passa. */
export function limparAjustes(bruto: Partial<Record<keyof Ajustes, unknown>>): Ajustes {
  const saida = { ...AJUSTES_PADRAO };
  for (const chave of Object.keys(AJUSTES_PADRAO) as (keyof Ajustes)[]) {
    const v = Number(bruto?.[chave]);
    saida[chave] = prender(v, LIMITES[chave].min, LIMITES[chave].max);
  }
  return saida;
}

/** O texto de `filter` do CSS, montado só com números. */
export function ajustesParaCss(bruto: Partial<Record<keyof Ajustes, unknown>>): string {
  const a = limparAjustes(bruto);
  const partes: string[] = [];
  if (a.luz !== 0) partes.push(`brightness(${(1 + a.luz / 100).toFixed(3)})`);
  if (a.contraste !== 0) partes.push(`contrast(${(1 + a.contraste / 100).toFixed(3)})`);
  if (a.vico !== 0) partes.push(`saturate(${(1 + a.vico / 80).toFixed(3)})`);
  if (a.calor > 0) partes.push(`sepia(${(a.calor / 140).toFixed(3)})`);
  if (a.calor < 0) partes.push(`hue-rotate(${Math.round(a.calor / 2)}deg)`);
  return partes.length ? partes.join(" ") : "none";
}

/** Quanto desfoque usar para a suavidade escolhida, em pontos da foto. */
export function raioDoDesfoque(suavidade: number, larguraDaFoto: number): number {
  const s = prender(suavidade, 0, 100);
  if (s === 0) return 0;
  // Uma foto maior precisa de raio maior para o mesmo efeito na pele.
  return Math.max(1, Math.round((larguraDaFoto / 420) * (0.6 + (s / 100) * 2.2)));
}

/** Abaixo disto a diferença é pele; acima, é detalhe que não pode borrar. */
export function limiarDeDetalhe(suavidade: number): number {
  const s = prender(suavidade, 0, 100);
  return Math.round(6 + (s / 100) * 22);
}

/**
 * A mistura, ponto a ponto.
 *
 * `original` e `borrado` são os mesmos pixels, um nítido e outro desfocado.
 * Onde os dois já estão perto, a pele é lisa e o borrado entra. Onde estão
 * longe, há detalhe de verdade e o original fica. O resultado é escrito em
 * `original`, que é o que vai para a tela.
 */
export function misturarSuavidade(
  original: Uint8ClampedArray,
  borrado: Uint8ClampedArray,
  limiar: number,
  forca: number,
): void {
  const f = Math.min(1, Math.max(0, forca));
  if (f === 0 || limiar <= 0) return;
  for (let i = 0; i < original.length; i += 4) {
    const dr = Math.abs(original[i]! - borrado[i]!);
    const dg = Math.abs(original[i + 1]! - borrado[i + 1]!);
    const db = Math.abs(original[i + 2]! - borrado[i + 2]!);
    const diferenca = (dr + dg + db) / 3;
    if (diferenca >= limiar) continue;
    // Perto do limiar o original volta aos poucos: sem essa rampa aparece
    // uma borda dura em volta dos olhos e da boca.
    const peso = f * (1 - diferenca / limiar);
    original[i] = original[i]! + (borrado[i]! - original[i]!) * peso;
    original[i + 1] = original[i + 1]! + (borrado[i + 1]! - original[i + 1]!) * peso;
    original[i + 2] = original[i + 2]! + (borrado[i + 2]! - original[i + 2]!) * peso;
  }
}

/** O quanto a suavidade escolhida realmente mistura. Nunca 100%: vira plástico. */
export function forcaDaSuavidade(suavidade: number): number {
  return (prender(suavidade, 0, 100) / 100) * 0.82;
}

/**
 * Aplica a suavidade num canvas já desenhado. Fica aqui, e não na tela, para
 * que a câmera e a galeria usem exatamente a mesma conta.
 */
export function suavizarNoCanvas(canvas: HTMLCanvasElement, suavidade: number): void {
  const forca = forcaDaSuavidade(suavidade);
  if (forca <= 0) return;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const nitido = ctx.getImageData(0, 0, w, h);

  const copia = document.createElement("canvas");
  copia.width = w;
  copia.height = h;
  const cctx = copia.getContext("2d");
  if (!cctx) return;
  cctx.filter = `blur(${raioDoDesfoque(suavidade, w)}px)`;
  cctx.drawImage(canvas, 0, 0);
  const macio = cctx.getImageData(0, 0, w, h);

  misturarSuavidade(nitido.data, macio.data, limiarDeDetalhe(suavidade), forca);
  ctx.putImageData(nitido, 0, 0);
}

/** O filtro que a pessoa montou fica no aparelho: é preferência de tela. */
const CHAVE = "nommi-meu-filtro";

export function lerMeuFiltro(): Ajustes | null {
  try {
    const cru = localStorage.getItem(CHAVE);
    if (!cru) return null;
    return limparAjustes(JSON.parse(cru) as Partial<Record<keyof Ajustes, unknown>>);
  } catch {
    return null;
  }
}

export function guardarMeuFiltro(a: Ajustes): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(limparAjustes(a)));
  } catch {
    // Aparelho sem armazenamento: o filtro vale só nesta sessão.
  }
}

export function esquecerMeuFiltro(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // Nada a fazer.
  }
}

/** Nome curto para o filtro da pessoa, conforme o que ela mexeu. */
export function nomeDoMeuFiltro(a: Ajustes): string {
  if (a.suavidade >= 60) return "Meu, bem suave";
  if (a.luz >= 20) return "Meu, bem claro";
  if (a.calor >= 20) return "Meu, quentinho";
  if (a.vico >= 20) return "Meu, vivo";
  return "Meu filtro";
}
