import { CATALOGO_DE_SELOS } from "./selos";

/**
 * A arte por cima da foto: texto e figurinha.
 *
 * Tudo aqui é posição relativa (0 a 1), nunca pixel. A pessoa arrasta numa
 * tela de 390 px e a foto é publicada com 1280: se a posição fosse em pixel,
 * a figurinha sairia do lugar. Em fração, ela cai exatamente onde foi posta.
 *
 * Nada do que a pessoa escreve vira estilo. A fonte e a cor são ids conferidos
 * contra os catálogos abaixo; o texto dela é só texto, desenhado no canvas.
 */

export type Fonte = { id: string; nome: string; familia: string; peso: number };
export type Estilo = "solto" | "contorno" | "caixa";

export const FONTES: Fonte[] = [
  { id: "gorda", nome: "Gordinha", familia: "'Baloo 2', system-ui", peso: 800 },
  { id: "mao", nome: "À mão", familia: "'Caveat', cursive", peso: 700 },
  { id: "limpa", nome: "Limpa", familia: "'DM Sans', system-ui", peso: 700 },
];

export const CORES = [
  "#FFFFFF",
  "#2E2E2E",
  "#007E46",
  "#FFB400",
  "#EF675A",
  "#8FD3B0",
  "#075E3B",
  "#F7F0DE",
];

/**
 * O arsenal de figurinhas, em três gavetas.
 *
 * Palavra de quadrinho é desenhada com a letra gorda da marca, não é emoji:
 * emoji de texto sai diferente em cada celular e "PÁ!" tem que sair igual.
 *
 * A gaveta de selos sai do mesmo catálogo de `selos.ts`, que já é fechado e
 * tem teste barrando palavra de aparência. Selo que vira figurinha continua
 * sendo elogio sobre como a pessoa é, nunca sobre o corpo dela.
 */
export type Figurinha = {
  id: string;
  nome: string;
  tipo: "palavra" | "emoji" | "selo";
  valor: string;
  fig?: string;
  grupo: "Reações" | "Quadrinho" | "Selos";
};

const PALAVRAS: [string, string][] = [
  ["pa", "PÁ!"],
  ["pum", "PUM!"],
  ["pow", "POW!"],
  ["uau", "UAU!"],
  ["aff", "AFF"],
  ["eita", "EITA"],
  ["amei", "AMEI"],
  ["socorro", "SOCORRO"],
  ["que-isso", "QUE ISSO"],
  ["to-rindo", "TÔ RINDO"],
  ["vem", "VEM!"],
  ["agora", "É AGORA"],
];

const EMOJIS: [string, string, string][] = [
  ["chifrinho", "Chifrinho", "😈"],
  ["raio", "Raio", "⚡"],
  ["fogo", "Fogo", "🔥"],
  ["coracao", "Coração", "💚"],
  ["estrela", "Estrela", "⭐"],
  ["risada", "Risada", "😂"],
  ["chorando-de-rir", "Chorando de rir", "🤣"],
  ["oculos", "Óculos", "🕶️"],
  ["coroa", "Coroa", "👑"],
  ["palmas", "Palmas", "👏"],
  ["festa", "Festa", "🎉"],
  ["brilho", "Brilho", "✨"],
  ["maozinha", "Mãozinha", "🫶"],
  ["apaixonada", "Apaixonada", "😍"],
  ["derretendo", "Derretendo", "🥹"],
  ["de-boa", "De boa", "😎"],
  ["olho-gordo", "Olho gordo", "🧿"],
  ["unha", "Unha feita", "💅"],
  ["cafe", "Café", "☕"],
  ["brinde", "Brinde", "🥂"],
  ["bolo", "Bolo", "🎂"],
  ["sol", "Sol", "🌞"],
  ["lua", "Lua", "🌙"],
  ["flor", "Flor", "🌻"],
];

export const FIGURINHAS: Figurinha[] = [
  ...EMOJIS.map(([id, nome, valor]) => ({
    id,
    nome,
    tipo: "emoji" as const,
    valor,
    grupo: "Reações" as const,
  })),
  ...PALAVRAS.map(([id, valor]) => ({
    id,
    nome: valor,
    tipo: "palavra" as const,
    valor,
    grupo: "Quadrinho" as const,
  })),
  ...CATALOGO_DE_SELOS.map((s) => ({
    id: "selo-" + s.selo.replace(/\s+/g, "-"),
    nome: s.selo,
    tipo: "selo" as const,
    valor: s.selo,
    fig: s.fig,
    grupo: "Selos" as const,
  })),
];

export const GRUPOS_DE_FIGURINHA = ["Reações", "Quadrinho", "Selos"] as const;
export const figurinhasDoGrupo = (g: (typeof GRUPOS_DE_FIGURINHA)[number]) =>
  FIGURINHAS.filter((f) => f.grupo === g);

export type Item = {
  id: string;
  tipo: "texto" | "figurinha";
  valor: string;
  x: number;
  y: number;
  escala: number;
  giro: number;
  cor: string;
  fonte: string;
  estilo: Estilo;
};

export const MAX_ITENS = 12;
export const MAX_TEXTO = 60;
export const ESCALA_MIN = 0.4;
export const ESCALA_MAX = 3;

export const fontePorId = (id: string): Fonte => FONTES.find((f) => f.id === id) ?? FONTES[0]!;
export const figurinhaPorId = (id: string): Figurinha | null =>
  FIGURINHAS.find((f) => f.id === id) ?? null;

const entre = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));

/** Texto é texto: tira quebra de linha e comando, e corta no tamanho. */
export function limparTexto(bruto: string): string {
  return String(bruto ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXTO);
}

/** O portão: nada entra num item sem passar por aqui. */
export function limparItem(bruto: Partial<Item>): Item | null {
  const tipo = bruto.tipo === "figurinha" ? "figurinha" : "texto";
  const valor = tipo === "texto" ? limparTexto(String(bruto.valor ?? "")) : String(bruto.valor ?? "");
  if (tipo === "texto" && !valor) return null;
  if (tipo === "figurinha" && !figurinhaPorId(valor)) return null;
  return {
    id: String(bruto.id ?? Math.random().toString(36).slice(2)),
    tipo,
    valor,
    x: entre(Number(bruto.x), 0, 1),
    y: entre(Number(bruto.y), 0, 1),
    escala: entre(Number(bruto.escala ?? 1), ESCALA_MIN, ESCALA_MAX),
    giro: entre(Number(bruto.giro ?? 0), -45, 45),
    cor: CORES.includes(String(bruto.cor)) ? String(bruto.cor) : CORES[0]!,
    fonte: FONTES.some((f) => f.id === bruto.fonte) ? String(bruto.fonte) : FONTES[0]!.id,
    estilo:
      bruto.estilo === "contorno" || bruto.estilo === "caixa" ? bruto.estilo : "solto",
  };
}

/** O tamanho da letra em pixels, para uma foto de largura `w`. */
export const tamanhoDaLetra = (escala: number, w: number) =>
  Math.round((w / 11) * entre(escala, ESCALA_MIN, ESCALA_MAX));

/** O que vai para o `font` do canvas e para o `style` da tela. */
export function fonteDoCanvas(item: Item, w: number): string {
  const f = fontePorId(item.fonte);
  return `${f.peso} ${tamanhoDaLetra(item.escala, w)}px ${f.familia}`;
}

/** O que o item mostra: a palavra do quadrinho, o emoji, ou o texto escrito. */
export function textoDoItem(item: Item): string {
  if (item.tipo === "texto") return item.valor;
  return figurinhaPorId(item.valor)?.valor ?? "";
}

/**
 * Carimba a arte na foto. Chamada só na hora de publicar: o que está na tela
 * é HTML, e o que vai para o arquivo é isto.
 */
export function desenharArte(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  itens: Item[],
): void {
  for (const bruto of itens.slice(0, MAX_ITENS)) {
    const item = limparItem(bruto);
    if (!item) continue;
    const texto = textoDoItem(item);
    if (!texto) continue;
    const tamanho = tamanhoDaLetra(item.escala, w);
    ctx.save();
    ctx.translate(item.x * w, item.y * h);
    ctx.rotate((item.giro * Math.PI) / 180);
    ctx.font = fonteDoCanvas(item, w);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (item.estilo === "caixa") {
      const largura = ctx.measureText(texto).width;
      const px = tamanho * 0.32;
      ctx.fillStyle = item.cor;
      const r = tamanho * 0.28;
      const x0 = -largura / 2 - px;
      const y0 = -tamanho * 0.62;
      const lw = largura + px * 2;
      const lh = tamanho * 1.24;
      ctx.beginPath();
      const arredonda = (ctx as { roundRect?: CanvasRenderingContext2D["roundRect"] }).roundRect;
      if (typeof arredonda === "function") arredonda.call(ctx, x0, y0, lw, lh, r);
      else ctx.rect(x0, y0, lw, lh);
      ctx.fill();
      ctx.fillStyle = item.cor === "#FFFFFF" ? "#2E2E2E" : "#FFFFFF";
      ctx.fillText(texto, 0, 0);
    } else {
      if (item.estilo === "contorno" || item.tipo === "figurinha") {
        ctx.lineWidth = Math.max(2, tamanho * 0.12);
        ctx.lineJoin = "round";
        ctx.strokeStyle = item.cor === "#FFFFFF" ? "rgba(0,0,0,.55)" : "#FFFFFF";
        ctx.strokeText(texto, 0, 0);
      }
      ctx.fillStyle = item.tipo === "figurinha" ? "#FFFFFF" : item.cor;
      // Emoji ignora fillStyle e desenha com as cores dele: é o que a gente quer.
      ctx.fillText(texto, 0, 0);
    }
    ctx.restore();
  }
}

/** Um item novo, já no meio da foto. */
export function itemNovo(tipo: "texto" | "figurinha", valor: string): Item | null {
  return limparItem({ tipo, valor, x: 0.5, y: 0.5, escala: 1, giro: 0 });
}
