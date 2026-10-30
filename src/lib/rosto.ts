/**
 * Onde fica o rosto na foto.
 *
 * Filtro de cor não sabe o que é um olho. Para clarear o olhar, pintar a boca
 * ou afinar o queixo, o programa precisa saber onde cada coisa está. Quem diz
 * isso é um modelo que acha 468 pontos do rosto, rodando **dentro do celular**:
 * a foto não vai para servidor nenhum.
 *
 * O modelo é um arquivo que o aparelho baixa na primeira vez. Por isso nada
 * aqui começa sozinho: a pessoa precisa ligar a maquiagem. Se o download
 * falhar, o app continua com os filtros de cor, sem quebrar e sem avisar duas
 * vezes.
 *
 * A conta toda — qual ponto é a boca, para onde o queixo anda, quanto a cor
 * entra — vive neste arquivo em funções puras, que têm teste. Só o carregar e
 * o desenhar tocam no navegador.
 */

export type Ponto = { x: number; y: number };

/**
 * Os pontos que interessam, no padrão de 468 do modelo.
 * Contorno fechado, na ordem, para dar para preencher como polígono.
 */
export const BOCA_FORA = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185,
];
export const BOCA_DENTRO = [
  78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191,
];
export const OLHO_ESQUERDO = [
  33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
];
export const OLHO_DIREITO = [
  263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466,
];
/** O contorno do rosto, de orelha a orelha passando pelo queixo. */
export const CONTORNO = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148,
  176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
];
/** Só a parte de baixo: é ela que afina. Mexer na testa deforma o rosto. */
export const MANDIBULA = [
  454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93,
  234,
];
export const QUEIXO = 152;
export const NARIZ_PONTA = 1;
export const NARIZ_ASA_ESQ = 48;
export const NARIZ_ASA_DIR = 278;
export const MACA_ESQ = 50;
export const MACA_DIR = 280;
export const TESTA = 10;

export type Maquiagem = {
  batom: number;
  corDoBatom: string;
  blush: number;
  olhos: number;
  afinar: number;
};

export const MAQUIAGEM_PADRAO: Maquiagem = {
  batom: 0,
  corDoBatom: "#B4556E",
  blush: 0,
  olhos: 0,
  afinar: 0,
};

/** As cores de batom, fechadas. Nada vem de fora como texto. */
export const CORES_DE_BATOM = [
  { id: "#B4556E", nome: "Rosé" },
  { id: "#8C3A3F", nome: "Vinho" },
  { id: "#D96B7B", nome: "Rosa" },
  { id: "#C2452D", nome: "Vermelho" },
  { id: "#A8566B", nome: "Malva" },
  { id: "#7A3B52", nome: "Amora" },
];

const entre = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));

export function limparMaquiagem(bruto: Partial<Record<keyof Maquiagem, unknown>>): Maquiagem {
  const cor = String(bruto?.corDoBatom ?? "");
  return {
    batom: Math.round(entre(Number(bruto?.batom), 0, 100)),
    corDoBatom: CORES_DE_BATOM.some((c) => c.id === cor) ? cor : MAQUIAGEM_PADRAO.corDoBatom,
    blush: Math.round(entre(Number(bruto?.blush), 0, 100)),
    olhos: Math.round(entre(Number(bruto?.olhos), 0, 100)),
    afinar: Math.round(entre(Number(bruto?.afinar), 0, 100)),
  };
}

export const temMaquiagem = (m: Maquiagem) =>
  m.batom > 0 || m.blush > 0 || m.olhos > 0 || m.afinar > 0;

/** Os pontos do modelo vêm de 0 a 1: aqui viram pixels da foto. */
export function emPixels(pontos: Ponto[], indices: number[], w: number, h: number): Ponto[] {
  const saida: Ponto[] = [];
  for (const i of indices) {
    const p = pontos[i];
    if (!p) continue;
    saida.push({ x: p.x * w, y: p.y * h });
  }
  return saida;
}

export function centroDe(pontos: Ponto[]): Ponto {
  if (pontos.length === 0) return { x: 0, y: 0 };
  let sx = 0;
  let sy = 0;
  for (const p of pontos) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / pontos.length, y: sy / pontos.length };
}

/** O tamanho do rosto, para o efeito acompanhar foto perto e foto longe. */
export function larguraDoRosto(pontos: Ponto[], w: number, h: number): number {
  const c = emPixels(pontos, CONTORNO, w, h);
  if (c.length < 4) return 0;
  let min = Infinity;
  let max = -Infinity;
  for (const p of c) {
    if (p.x < min) min = p.x;
    if (p.x > max) max = p.x;
  }
  return Math.max(0, max - min);
}

/**
 * Para onde cada ponto da mandíbula anda ao afinar.
 *
 * Cada lado é puxado na direção do queixo, e quem está mais perto do queixo
 * anda menos: é isso que afina sem entortar a orelha. O resultado é em pixels,
 * e nunca passa de uma fração pequena da largura do rosto — mão pesada aqui
 * vira desenho animado, não rosto.
 */
export function deslocamentoDoAfinar(
  mandibula: Ponto[],
  queixo: Ponto,
  forca: number,
  larguraRosto: number,
): Ponto[] {
  const f = entre(forca, 0, 100) / 100;
  const teto = larguraRosto * 0.055;
  return mandibula.map((p) => {
    const dx = queixo.x - p.x;
    const dy = queixo.y - p.y;
    const dist = Math.hypot(dx, dy) || 1;
    // Longe do queixo (maçã do rosto) anda mais; junto do queixo, quase nada.
    const peso = Math.min(1, dist / (larguraRosto * 0.55 || 1));
    const anda = f * teto * peso;
    return { x: (dx / dist) * anda, y: (dy / dist) * anda * 0.35 };
  });
}

/**
 * O empurrão num ponto qualquer da foto, somando a influência de cada âncora.
 * É o que permite mexer no contorno sem rasgar o resto da imagem: longe das
 * âncoras o deslocamento vira zero.
 */
export function empurrao(
  ponto: Ponto,
  ancoras: Ponto[],
  deslocamentos: Ponto[],
  raio: number,
): Ponto {
  let dx = 0;
  let dy = 0;
  const r2 = Math.max(1, raio * raio);
  for (let i = 0; i < ancoras.length; i++) {
    const a = ancoras[i];
    const d = deslocamentos[i];
    if (!a || !d) continue;
    const ex = ponto.x - a.x;
    const ey = ponto.y - a.y;
    const dist2 = ex * ex + ey * ey;
    if (dist2 > r2) continue;
    // Peso que começa em 1 na âncora e termina em 0 na borda do raio.
    const t = 1 - dist2 / r2;
    const peso = t * t;
    dx += d.x * peso;
    dy += d.y * peso;
  }
  return { x: dx, y: dy };
}

/** Quanto da cor entra, para uma intensidade escolhida. Nunca 100%. */
export const forcaDaCor = (n: number, teto: number) => (entre(n, 0, 100) / 100) * teto;

export const FORCA_BATOM = 0.55;
export const FORCA_BLUSH = 0.3;
export const FORCA_OLHOS = 0.45;

/** O endereço do modelo e do motor. Baixados só quando a pessoa liga. */
export const ENDERECO_BIBLIOTECA =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/vision_bundle.mjs";
export const ENDERECO_WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/wasm";
export const ENDERECO_MODELO =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

type Detector = {
  detect: (imagem: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement) => {
    faceLandmarks?: Ponto[][];
  };
};

let detector: Detector | null = null;
let tentando: Promise<Detector | null> | null = null;

/**
 * Carrega o modelo uma vez por sessão. Erro aqui nunca quebra a câmera:
 * devolve null e quem chamou segue sem maquiagem.
 */
export async function carregarRosto(): Promise<Detector | null> {
  if (detector) return detector;
  if (tentando) return tentando;
  tentando = (async () => {
    try {
      // Carregado do CDN, não como dependência: o build da Lovable usa bun com
      // lockfile travado, e 43 MB de pacote não têm por que entrar na árvore
      // para um recurso que a pessoa liga quando quer.
      const vision = (await import(/* @vite-ignore */ ENDERECO_BIBLIOTECA)) as unknown as {
        FilesetResolver: { forVisionTasks: (p: string) => Promise<unknown> };
        FaceLandmarker: {
          createFromOptions: (f: unknown, o: unknown) => Promise<unknown>;
        };
      };
      const fileset = await vision.FilesetResolver.forVisionTasks(ENDERECO_WASM);
      const criado = await vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: ENDERECO_MODELO, delegate: "GPU" },
        runningMode: "IMAGE",
        numFaces: 1,
      });
      detector = criado as unknown as Detector;
      return detector;
    } catch {
      return null;
    } finally {
      tentando = null;
    }
  })();
  return tentando;
}

/** Os 468 pontos do rosto na imagem, ou null se não achou rosto nenhum. */
export async function acharRosto(imagem: HTMLCanvasElement): Promise<Ponto[] | null> {
  const d = await carregarRosto();
  if (!d) return null;
  try {
    const r = d.detect(imagem);
    const pontos = r?.faceLandmarks?.[0];
    return pontos && pontos.length > 400 ? pontos : null;
  } catch {
    return null;
  }
}
