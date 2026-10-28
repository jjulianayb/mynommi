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
