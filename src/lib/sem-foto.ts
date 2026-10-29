export type Figura = "mulher" | "homem" | "neutro";
export const FIGURAS: { id: Figura; nome: string }[] = [
  { id: "mulher", nome: "Mulher" },
  { id: "homem", nome: "Homem" },
  { id: "neutro", nome: "Prefiro não dizer" },
];
export const figuraValida = (v: unknown): Figura =>
  v === "mulher" || v === "homem" ? v : "neutro";

/**
 * O desenho de quem ainda não pôs foto.
 * Antes disso, o app mostrava uma pessoa da apresentação no lugar — o Felipe
 * abriu a conta dele e viu o rosto de uma desconhecida. Nunca mais: sem foto,
 * aparece a inicial da pessoa, não a cara de outra.
 */

const CORES = [
  { fundo: "#0C5C3B", letra: "#F7F0DE" },
  { fundo: "#EF675A", letra: "#FFFFFF" },
  { fundo: "#FFB400", letra: "#2A1F00" },
  { fundo: "#2B6B88", letra: "#F2F8FB" },
  { fundo: "#8A3A52", letra: "#FFF1F4" },
  { fundo: "#5A7A2E", letra: "#F7FBEF" },
  { fundo: "#A95A2E", letra: "#FFF6EF" },
  { fundo: "#3A4654", letra: "#EEF2F7" },
];

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/** Uma ou duas letras: a inicial do nome e a do sobrenome, quando há. */
export function iniciais(nome: string): string {
  const partes = semAcento(nome)
    .split(/\s+/)
    .filter((p) => /[A-Za-zÀ-ÿ0-9]/.test(p));
  if (partes.length === 0) return "";
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
  return (primeira + ultima).toUpperCase().slice(0, 2);
}

/** A mesma pessoa tem sempre a mesma cor, em qualquer tela e em qualquer aparelho. */
export function corDoNome(nome: string): { fundo: string; letra: string } {
  const limpo = semAcento(nome).toLowerCase();
  let soma = 0;
  for (let i = 0; i < limpo.length; i++) soma = (soma * 31 + limpo.charCodeAt(i)) % 100000;
  return CORES[soma % CORES.length]!;
}

/**
 * O bonequinho. A pessoa escolhe qual é o dela — é escolha de desenho,
 * não cadastro de gênero: o app não usa isso para filtrar nem para combinar.
 */
export function desenhoDaFigura(figura: Figura, cabelo: string, pele: string): string {
  const rosto =
    `<circle cx="32" cy="29" r="11.5" fill="${pele}"/>` +
    `<ellipse cx="32" cy="60" rx="17" ry="15" fill="${pele}"/>` +
    `<circle cx="28.2" cy="29" r="1.5" fill="#3B2F2A"/><circle cx="35.8" cy="29" r="1.5" fill="#3B2F2A"/>` +
    `<path d="M28.4 33.6c1.8 1.8 5.4 1.8 7.2 0" stroke="#3B2F2A" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
  const cabelos: Record<Figura, string> = {
    mulher: `<path d="M18.5 32c0-8.5 6-15 13.5-15s13.5 6.5 13.5 15c0 6-1 12-2 14-1-4.5-1-13.5-1-13.5s-3.5 4-10.5 4-10.5-4-10.5-4 0 9-1 13.5c-1-2-2-8-2-14z" fill="${cabelo}"/>`,
    homem: `<path d="M20 27c0-7.5 5.4-13 12-13s12 5.5 12 13c0 2-1 3-1 3s-2-6.5-11-6.5S21 30 21 30s-1-1-1-3z" fill="${cabelo}"/>`,
    neutro: `<path d="M20 28c0-7.5 5.4-13.5 12-13.5S44 20.5 44 28c0 2.2-1 3.4-1 3.4s-2.2-7-11-7-11 7-11 7-1-1.2-1-3.4z" fill="${cabelo}"/>`,
  };
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">` +
    rosto +
    cabelos[figura] +
    `</svg>`
  );
}
