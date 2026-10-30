import type { CSSProperties } from "react";
import { PRESET_BACKGROUNDS, enderecoDaImagem } from "./covers";

/**
 * O fundo de teia: é a identidade da nommi e é o que a pessoa escolhe para a
 * própria página. O desenho é sempre o mesmo; o que muda é a cor.
 * Nada aqui vem do banco como texto de CSS — só o id, conferido contra esta lista.
 */

export type Desenho =
  | "teia"
  | "degrade"
  | "tiedye"
  | "bolinhas"
  | "ondas"
  | "listras"
  | "folhas"
  | "estrelas"
  | "xadrez"
  | "confete";

export type Grupo = "Teia" | "Degradê" | "Tie-dye" | "Estampa";

export type Fundo = {
  id: string;
  nome: string;
  base: string;
  linha: string;
  no: string;
  tom: "claro" | "escuro";
  desenho?: Desenho;
  grupo?: Grupo;
};

export const GRUPOS_DE_FUNDO: Grupo[] = ["Teia", "Degradê", "Tie-dye", "Estampa"];
export const grupoDoFundo = (f: Fundo): Grupo => f.grupo ?? "Teia";
export const fundosDoGrupo = (g: Grupo) => FUNDOS.filter((f) => grupoDoFundo(f) === g);

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

  // Degradê: a cor escorrendo, sem desenho nenhum em cima.
  { id: "deg-amanhecer", nome: "Amanhecer", base: "#FF9A62", linha: "#FFD166", no: "#FFF3D6", tom: "escuro", desenho: "degrade", grupo: "Degradê" },
  { id: "deg-anoitecer", nome: "Anoitecer", base: "#2B1B4D", linha: "#6B3FA0", no: "#C56BA0", tom: "escuro", desenho: "degrade", grupo: "Degradê" },
  { id: "deg-mar", nome: "Mar", base: "#043B5C", linha: "#1C86A8", no: "#8FD3B0", tom: "escuro", desenho: "degrade", grupo: "Degradê" },
  { id: "deg-algodao", nome: "Algodão-doce", base: "#FFC2D1", linha: "#D9B8FF", no: "#BDE0FE", tom: "claro", desenho: "degrade", grupo: "Degradê" },
  { id: "deg-limao", nome: "Limão", base: "#D9F99D", linha: "#8FD3B0", no: "#E6F3EA", tom: "claro", desenho: "degrade", grupo: "Degradê" },
  { id: "deg-cafe", nome: "Café", base: "#3B2A20", linha: "#6F4E37", no: "#C8A27A", tom: "escuro", desenho: "degrade", grupo: "Degradê" },
  { id: "deg-uva", nome: "Uva", base: "#3A0E4D", linha: "#7B2CBF", no: "#E0AAFF", tom: "escuro", desenho: "degrade", grupo: "Degradê" },
  { id: "deg-neve", nome: "Neve", base: "#FAF9F6", linha: "#E6F3EA", no: "#BDE0FE", tom: "claro", desenho: "degrade", grupo: "Degradê" },

  // Tie-dye: manchas redondas que se misturam, como camiseta tingida.
  { id: "tie-verao", nome: "Verão", base: "#FFB400", linha: "#EF675A", no: "#8FD3B0", tom: "escuro", desenho: "tiedye", grupo: "Tie-dye" },
  { id: "tie-oceano", nome: "Oceano", base: "#075E3B", linha: "#1C86A8", no: "#BDE0FE", tom: "escuro", desenho: "tiedye", grupo: "Tie-dye" },
  { id: "tie-rosa", nome: "Rosa", base: "#FFC2D1", linha: "#C56BA0", no: "#FFF3D6", tom: "claro", desenho: "tiedye", grupo: "Tie-dye" },
  { id: "tie-roxo", nome: "Roxo", base: "#3A0E4D", linha: "#7B2CBF", no: "#FFB400", tom: "escuro", desenho: "tiedye", grupo: "Tie-dye" },
  { id: "tie-terra", nome: "Terra", base: "#7A3E1D", linha: "#E0A93F", no: "#D9F99D", tom: "escuro", desenho: "tiedye", grupo: "Tie-dye" },

  // Estampa: desenho repetido, como papel de parede.
  { id: "est-bolinhas", nome: "Bolinhas", base: "#FFF3D6", linha: "#EF675A", no: "#007E46", tom: "claro", desenho: "bolinhas", grupo: "Estampa" },
  { id: "est-bolinhas-noite", nome: "Bolinhas da noite", base: "#14181F", linha: "#FFB400", no: "#8FD3B0", tom: "escuro", desenho: "bolinhas", grupo: "Estampa" },
  { id: "est-ondas", nome: "Ondas", base: "#043B5C", linha: "#1C86A8", no: "#8FD3B0", tom: "escuro", desenho: "ondas", grupo: "Estampa" },
  { id: "est-ondas-areia", nome: "Ondas na areia", base: "#FFF3D6", linha: "#E0A93F", no: "#C8A27A", tom: "claro", desenho: "ondas", grupo: "Estampa" },
  { id: "est-listras", nome: "Listras", base: "#F2EADA", linha: "#075E3B", no: "#007E46", tom: "claro", desenho: "listras", grupo: "Estampa" },
  { id: "est-listras-festa", nome: "Listras de festa", base: "#3A0E4D", linha: "#FFB400", no: "#EF675A", tom: "escuro", desenho: "listras", grupo: "Estampa" },
  { id: "est-folhas", nome: "Folhas", base: "#07351F", linha: "#2F7B54", no: "#8FD3B0", tom: "escuro", desenho: "folhas", grupo: "Estampa" },
  { id: "est-folhas-claro", nome: "Folhas de manhã", base: "#E6F3EA", linha: "#6FAE8A", no: "#2F7B54", tom: "claro", desenho: "folhas", grupo: "Estampa" },
  { id: "est-estrelas", nome: "Estrelas", base: "#14181F", linha: "#FFF3D6", no: "#FFB400", tom: "escuro", desenho: "estrelas", grupo: "Estampa" },
  { id: "est-xadrez", nome: "Xadrez", base: "#FFF3D6", linha: "#8FD3B0", no: "#007E46", tom: "claro", desenho: "xadrez", grupo: "Estampa" },
  { id: "est-confete", nome: "Confete", base: "#FAF9F6", linha: "#EF675A", no: "#FFB400", tom: "claro", desenho: "confete", grupo: "Estampa" },
  { id: "est-confete-noite", nome: "Confete da noite", base: "#2B1B4D", linha: "#8FD3B0", no: "#FFB400", tom: "escuro", desenho: "confete", grupo: "Estampa" },
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

const moldura = (dentro: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice">${dentro}</svg>`;

/**
 * Cada estampa é desenhada em SVG com as três cores do fundo. SVG porque é
 * leve, não depende de arquivo nenhum e fica nítido em qualquer tela.
 */
export function desenhoDoFundo(f: Fundo): string {
  const d = f.desenho ?? "teia";
  const fundo = `<rect width="390" height="844" fill="${f.base}"/>`;

  if (d === "degrade")
    return moldura(
      `<defs><linearGradient id="g" x1="0" y1="0" x2="0.35" y2="1">` +
        `<stop offset="0%" stop-color="${f.base}"/>` +
        `<stop offset="52%" stop-color="${f.linha}"/>` +
        `<stop offset="100%" stop-color="${f.no}"/></linearGradient></defs>` +
        `<rect width="390" height="844" fill="url(#g)"/>`,
    );

  if (d === "tiedye") {
    const manchas = [
      [70, 120, 190],
      [320, 260, 230],
      [120, 520, 250],
      [330, 700, 210],
      [200, 380, 170],
    ]
      .map(
        ([cx, cy, r], i) =>
          `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${i % 2 ? f.linha : f.no}" opacity="0.55"/>`,
      )
      .join("");
    return moldura(
      `<defs><filter id="b"><feGaussianBlur stdDeviation="46"/></filter></defs>` +
        fundo +
        `<g filter="url(#b)">${manchas}</g>`,
    );
  }

  if (d === "bolinhas") {
    const pontos: string[] = [];
    for (let y = 0; y < 844; y += 52)
      for (let x = 0; x < 390; x += 52) {
        const desloca = (y / 52) % 2 ? 26 : 0;
        const cor = (x + y) % 104 === 0 ? f.no : f.linha;
        pontos.push(`<circle cx="${x + desloca}" cy="${y}" r="7" fill="${cor}" opacity="0.7"/>`);
      }
    return moldura(fundo + pontos.join(""));
  }

  if (d === "ondas") {
    const ondas: string[] = [];
    for (let y = 40; y < 880; y += 56)
      ondas.push(
        `<path d="M-20 ${y} q 50 -26 100 0 t 100 0 t 100 0 t 100 0 t 100 0" fill="none" ` +
          `stroke="${(y / 56) % 2 ? f.linha : f.no}" stroke-width="5" stroke-linecap="round" opacity="0.75"/>`,
      );
    return moldura(fundo + ondas.join(""));
  }

  if (d === "listras") {
    const faixas: string[] = [];
    for (let i = -844; i < 844; i += 58)
      faixas.push(
        `<rect x="${i}" y="-200" width="26" height="1300" fill="${
          (i / 58) % 2 ? f.linha : f.no
        }" opacity="0.5" transform="rotate(18 195 422)"/>`,
      );
    return moldura(fundo + faixas.join(""));
  }

  if (d === "folhas") {
    const folhas: string[] = [];
    let n = 0;
    for (let y = 30; y < 870; y += 94)
      for (let x = 20; x < 400; x += 86) {
        const giro = (n * 47) % 360;
        const cor = n % 3 === 0 ? f.no : f.linha;
        folhas.push(
          `<path d="M0 -26 C 17 -12 17 12 0 26 C -17 12 -17 -12 0 -26 Z" fill="${cor}" ` +
            `opacity="0.72" transform="translate(${x} ${y}) rotate(${giro})"/>`,
        );
        n++;
      }
    return moldura(fundo + folhas.join(""));
  }

  if (d === "estrelas") {
    const estrelas: string[] = [];
    let n = 0;
    for (let y = 30; y < 870; y += 76)
      for (let x = 24; x < 400; x += 74) {
        const r = 4 + ((n * 7) % 5);
        const cor = n % 4 === 0 ? f.no : f.linha;
        const dx = ((n * 29) % 24) - 12;
        estrelas.push(
          `<path d="M0 ${-r * 2.2} L ${r * 0.7} ${-r * 0.7} L ${r * 2.2} 0 L ${r * 0.7} ${r * 0.7} ` +
            `L 0 ${r * 2.2} L ${-r * 0.7} ${r * 0.7} L ${-r * 2.2} 0 L ${-r * 0.7} ${-r * 0.7} Z" ` +
            `fill="${cor}" opacity="0.85" transform="translate(${x + dx} ${y})"/>`,
        );
        n++;
      }
    return moldura(fundo + estrelas.join(""));
  }

  if (d === "xadrez") {
    const quadros: string[] = [];
    for (let y = 0; y < 844; y += 62)
      for (let x = 0; x < 390; x += 62)
        if (((x / 62) + (y / 62)) % 2 === 0)
          quadros.push(`<rect x="${x}" y="${y}" width="62" height="62" fill="${f.linha}" opacity="0.85"/>`);
    const linhasFinas = [];
    for (let x = 31; x < 390; x += 62)
      linhasFinas.push(`<rect x="${x}" y="0" width="4" height="844" fill="${f.no}" opacity="0.55"/>`);
    return moldura(fundo + quadros.join("") + linhasFinas.join(""));
  }

  if (d === "confete") {
    const pedacos: string[] = [];
    let n = 0;
    for (let y = 20; y < 870; y += 58)
      for (let x = 14; x < 400; x += 56) {
        const giro = (n * 63) % 360;
        const cor = n % 3 === 0 ? f.no : f.linha;
        const dx = ((n * 17) % 20) - 10;
        pedacos.push(
          `<rect x="-5" y="-12" width="10" height="24" rx="4" fill="${cor}" opacity="0.8" ` +
            `transform="translate(${x + dx} ${y}) rotate(${giro})"/>`,
        );
        n++;
      }
    return moldura(fundo + pedacos.join(""));
  }

  return teiaSvg(f);
}

const comoUrl = (svg: string) => `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;

/** Estilo do fundo: teia da nommi, foto enviada, ou nada. */
export function estiloDoFundo(valor: string): CSSProperties {
  const f = fundoPorId(valor);
  if (f)
    return {
      backgroundColor: f.base,
      backgroundImage: comoUrl(desenhoDoFundo(f)),
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  if (!valor) return {};
  // ids antigos de gradiente continuam funcionando para quem já escolheu um
  const antigo = PRESET_BACKGROUNDS.find((p) => p.id === valor);
  if (antigo) return { background: antigo.css };
  const src = enderecoDaImagem(valor);
  if (!src) return {};
  return {
    backgroundImage: `url(${src})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

/** Miniatura para o seletor, na proporção de um cartão. */
export function miniaturaDoFundo(f: Fundo): CSSProperties {
  return {
    backgroundColor: f.base,
    backgroundImage: comoUrl(desenhoDoFundo(f)),
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
  if (!valor) return "claro";
  const antigo = PRESET_BACKGROUNDS.find((p) => p.id === valor);
  if (antigo) return antigo.id === "papel" ? "claro" : "escuro";
  return enderecoDaImagem(valor) ? "escuro" : "claro";
}
