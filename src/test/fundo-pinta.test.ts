import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FUNDOS, estiloDoFundo } from "@/lib/fundos";

const css = readFileSync("src/styles.css", "utf8");

/**
 * O fundo da página pessoal ficou semanas sem pintar nada. O motivo não estava
 * no banco nem na função: `.mynommi>*` vinha depois de `.mynommi-fundo`, com a
 * mesma força, e devolvia a camada do fundo para `position:relative`. Um div
 * vazio relativo tem altura zero, então o fundo existia e não aparecia.
 */
describe("a camada do fundo precisa continuar fora do fluxo", () => {
  it("a regra que empurra os filhos para cima não pode pegar o fundo", () => {
    const geral = css.match(/\.mynommi>\*[^{]*\{[^}]*\}/)?.[0] ?? "";
    expect(geral).toContain(":not(.mynommi-fundo)");
  });
  it("o fundo continua absoluto e atrás", () => {
    const regra = css.match(/\.mynommi-fundo\{[^}]*\}/)?.[0] ?? "";
    expect(regra).toContain("position:absolute");
    expect(regra).toContain("inset:0");
  });
});

describe("todo fundo do catálogo vira estilo de verdade", () => {
  it("cada id devolve uma imagem", () => {
    for (const f of FUNDOS) {
      const s = estiloDoFundo(f.id) as Record<string, string>;
      expect(s["backgroundImage"], f.id).toContain("data:image/svg+xml");
    }
  });
  it("id desconhecido não vira estilo nenhum", () => {
    expect(estiloDoFundo("teia-que-nao-existe")).toEqual({});
    expect(estiloDoFundo("")).toEqual({});
  });
  it("sem background-attachment fixed: o iPhone não desenha e some tudo", () => {
    for (const f of FUNDOS) {
      const s = estiloDoFundo(f.id) as Record<string, string>;
      expect(s["backgroundAttachment"]).toBeUndefined();
    }
  });
});
