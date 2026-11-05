import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FUNDOS, fundoEhFoto, tomDoFundo } from "@/lib/fundos";

/**
 * O editor do Lovable reformata o styles.css a cada save (prettier dele), e o
 * formato que sobra no repositório não é mais o minificado original. O que
 * estes testes protegem é a regra (seletor, propriedade, valor, ordem), não a
 * diagramação: leia o CSS já normalizado para a asserção não depender de
 * espaço, quebra de linha ou ponto e vírgula final.
 */
function lerCss(caminho = "src/styles.css"): string {
  return readFileSync(caminho, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*\{\s*/g, "{")
    .replace(/\s*\}\s*/g, "}")
    .replace(/:\s+/g, ":")
    .replace(/,\s+/g, ",")
    .replace(/\s*>\s*/g, ">")
    .replace(/;\s*/g, ";")
    .replace(/;}/g, "}")
    .replace(/}/g, "}\n");
}

const css = lerCss();

/** Luminância simples (sRGB ponderado) da cor de base. */
function luminancia(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe("o tom declarado combina com a cor de base", () => {
  it("nenhum fundo claro declara texto claro, nem fundo escuro declara texto escuro", () => {
    for (const f of FUNDOS) {
      const lum = luminancia(f.base);
      if (f.tom === "claro") expect(lum, `${f.id} (${f.base})`).toBeGreaterThan(0.35);
      else expect(lum, `${f.id} (${f.base})`).toBeLessThan(0.35);
    }
  });
  it("gradientes antigos claros também pedem texto escuro", () => {
    expect(tomDoFundo("amanhecer")).toBe("claro");
    expect(tomDoFundo("cerrado")).toBe("claro");
    expect(tomDoFundo("papel")).toBe("claro");
    expect(tomDoFundo("noite")).toBe("escuro");
    expect(tomDoFundo("teia-verde")).toBe("escuro");
  });
});

describe("foto de fundo pede véu escuro", () => {
  it("reconhece foto, preset e vazio", () => {
    expect(fundoEhFoto("abc/foto-1.jpg")).toBe(true);
    expect(fundoEhFoto("https://x.com/foto.jpg")).toBe(true);
    expect(fundoEhFoto("teia-mata")).toBe(false);
    expect(fundoEhFoto("amanhecer")).toBe(false);
    expect(fundoEhFoto("")).toBe(false);
    expect(tomDoFundo("abc/foto-1.jpg")).toBe("escuro");
  });
  it("o véu existe no CSS das duas telas com fundo", () => {
    const regra = css.match(/\.mynommi-fundo\.foto::after[^{]*\{[^}]*\}/)?.[0] ?? "";
    expect(regra).toContain(".combinar-fundo.foto::after");
    expect(regra).toContain("rgba(0,0,0");
  });
});
