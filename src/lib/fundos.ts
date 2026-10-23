import type { CSSProperties } from "react";
import { publicUrl } from "./covers";

/**
 * O fundo de teia: é a identidade da nommi e é o que a pessoa escolhe para a
 * própria página. O desenho é sempre o mesmo; o que muda é a cor.
 * Nada aqui vem do banco como texto de CSS — só o id, conferido contra esta lista.
 */

export type Fundo = {
  id: string;
  nome: string;
  base: string;
  linha: string;
  no: string;
  tom: "claro" | "escuro";
};

export const FUNDOS: Fundo[] = [
  {
    id: "teia-mata",
    nome: "Mata",
    base: "#07351F",
    linha: "#2F7B54",
    no: "#3E9A6B",
    tom: "escuro",
  },
  {
    id: "teia-noite",
    nome: "Noite",
    base: "#14181F",
    linha: "#3A4654",
    no: "#5B6B7E",
    tom: "escuro",
  },
  {
    id: "teia-vinho",
    nome: "Vinho",
    base: "#3B1220",
    linha: "#8A3A52",
    no: "#B4556E",
    tom: "escuro",
  },
  {
    id: "teia-brasa",
    nome: "Brasa",
    base: "#5A2411",
    linha: "#A95A2E",
    no: "#E07A3C",
    tom: "escuro",
  },
  {
    id: "teia-oceano",
    nome: "Oceano",
    base: "#0B2E40",
    linha: "#2B6B88",
    no: "#4A93B3",
    tom: "escuro",
  },
  {
    id: "teia-papel",
    nome: "Papel",
    base: "#F2EADA",
    linha: "#D6C9AC",
    no: "#BCA87F",
    tom: "claro",
  },
  {
    id: "teia-manha",
    nome: "Manhã",
    base: "#FFF3D6",
    linha: "#F0CE86",
    no: "#E0A93F",
    tom: "claro",
  },
  {
    id: "teia-menta",
    nome: "Menta",
    base: "#E6F3EA",
    linha: "#A9CFB8",
    no: "#6FAE8A",
    tom: "claro",
  },
];

export const fundoPorId = (id: string): Fundo | null => FUNDOS.find((f) => f.id === id) ?? null;

/** O desenho da teia, em SVG, com as cores do fundo escolhido. */
export function teiaSvg(f: Fundo): string {
  const linhas = [
    "M40 120 L150 60 L300 130 L350 60",
    "M20 300 L120 230 L240 300 L370 240",
    "M60 520 L180 470 L310 540 L380 470",
    "M30 700 L140 640 L270 710 L360 650",
    "M150 60 L120 230 L180 470 L140 640",
    "M300 130 L240 300 L310 540 L270 710",
    "M40 120 L20 300 L60 520 L30 700",
    "M350 60 L370 240 L380 470 L360 650",
  ]
    .map((d) => `<path d="${d}"/>`)
    .join("");
  const nos = [
    [40, 120],
    [150, 60],
    [300, 130],
    [350, 60],
    [20, 300],
    [120, 230],
    [240, 300],
    [370, 240],
    [60, 520],
    [180, 470],
    [310, 540],
    [380, 470],
    [30, 700],
    [140, 640],
    [270, 710],
    [360, 650],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5"/>`)
    .join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice">` +
    `<rect width="390" height="844" fill="${f.base}"/>` +
    `<g stroke="${f.linha}" stroke-width="1" fill="none" opacity="0.85">${linhas}</g>` +
    `<g fill="${f.no}">${nos}</g></svg>`
  );
}

const comoUrl = (svg: string) => `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;

/** Estilo do fundo: teia da nommi, foto enviada, ou nada. */
export function estiloDoFundo(valor: string): CSSProperties {
  const f = fundoPorId(valor);
  if (f)
    return {
      backgroundColor: f.base,
      backgroundImage: comoUrl(teiaSvg(f)),
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
    };
  if (!valor) return {};
  return {
    backgroundImage: `url(${publicUrl(valor)})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

/** Miniatura para o seletor, na proporção de um cartão. */
export function miniaturaDoFundo(f: Fundo): CSSProperties {
  return {
    backgroundColor: f.base,
    backgroundImage: comoUrl(teiaSvg(f)),
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

/**
 * Em fundo escuro o texto é claro, e vice-versa. Foto enviada conta como escura,
 * porque por cima dela vai um véu escuro para o texto continuar legível.
 */
export function tomDoFundo(valor: string): "claro" | "escuro" {
  const f = fundoPorId(valor);
  if (f) return f.tom;
  return valor ? "escuro" : "claro";
}
