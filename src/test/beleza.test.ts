import { describe, expect, it } from "vitest";
import {
  AJUSTES_PADRAO,
  ajustesParaCss,
  forcaDaSuavidade,
  limiarDeDetalhe,
  limparAjustes,
  misturarSuavidade,
  nomeDoMeuFiltro,
  raioDoDesfoque,
} from "@/lib/beleza";
import { FILTROS, filtroCss, suavidadeDoFiltro } from "@/lib/camera";

describe("o filtro montado pela pessoa nunca vira texto solto no CSS", () => {
  it("só números entram", () => {
    const sujo = { luz: "20); background:url(x" as unknown as number, contraste: NaN, calor: 1e9 };
    const css = ajustesParaCss(sujo);
    expect(css).not.toContain("url(");
    expect(css).not.toContain(";");
    expect(css).not.toContain("background");
  });
  it("prende cada controle no limite", () => {
    const a = limparAjustes({ luz: 900, contraste: -900, suavidade: 900, calor: -900, vico: 900 });
    expect(a.luz).toBe(50);
    expect(a.contraste).toBe(-50);
    expect(a.suavidade).toBe(100);
    expect(a.calor).toBe(-50);
    expect(a.vico).toBe(50);
  });
  it("tudo em zero não mexe em nada", () => {
    expect(ajustesParaCss(AJUSTES_PADRAO)).toBe("none");
  });
  it("calor para um lado esquenta, para o outro esfria", () => {
    expect(ajustesParaCss({ ...AJUSTES_PADRAO, calor: 30 })).toContain("sepia");
    expect(ajustesParaCss({ ...AJUSTES_PADRAO, calor: -30 })).toContain("hue-rotate");
  });
  it("o nome acompanha o que a pessoa mexeu", () => {
    expect(nomeDoMeuFiltro({ ...AJUSTES_PADRAO, suavidade: 70 })).toContain("suave");
    expect(nomeDoMeuFiltro(AJUSTES_PADRAO)).toBe("Meu filtro");
  });
});

describe("a pele suave guarda o detalhe", () => {
  const pixel = (v: number[]) => Uint8ClampedArray.from(v);

  it("onde a diferença é pequena, a pele lisa entra", () => {
    const nitido = pixel([200, 180, 170, 255]);
    const macio = pixel([204, 184, 174, 255]);
    misturarSuavidade(nitido, macio, 20, 0.8);
    expect(nitido[0]).toBeGreaterThan(200);
    expect(nitido[0]).toBeLessThanOrEqual(204);
  });

  it("onde há detalhe de verdade, o original não é tocado", () => {
    const nitido = pixel([20, 18, 16, 255]); // um cílio escuro
    const macio = pixel([200, 180, 170, 255]); // a pele em volta
    misturarSuavidade(nitido, macio, 20, 0.8);
    expect(Array.from(nitido)).toEqual([20, 18, 16, 255]);
  });

  it("suavidade zero não mexe em nada", () => {
    const nitido = pixel([200, 180, 170, 255]);
    misturarSuavidade(nitido, pixel([150, 150, 150, 255]), 20, 0);
    expect(Array.from(nitido)).toEqual([200, 180, 170, 255]);
  });

  it("nunca borra 100%: pele 100% misturada vira plástico", () => {
    expect(forcaDaSuavidade(100)).toBeLessThan(1);
    expect(forcaDaSuavidade(0)).toBe(0);
  });

  it("o raio acompanha o tamanho da foto", () => {
    expect(raioDoDesfoque(0, 1280)).toBe(0);
    expect(raioDoDesfoque(50, 1280)).toBeGreaterThan(raioDoDesfoque(50, 480));
  });

  it("quanto mais suavidade, mais coisa conta como pele", () => {
    expect(limiarDeDetalhe(100)).toBeGreaterThan(limiarDeDetalhe(10));
  });

  it("a transparência nunca é alterada", () => {
    const nitido = pixel([200, 180, 170, 120]);
    misturarSuavidade(nitido, pixel([202, 182, 172, 255]), 30, 0.8);
    expect(nitido[3]).toBe(120);
  });
});

describe("o catálogo de filtros", () => {
  it("não repete id e nenhum CSS traz coisa de fora", () => {
    const ids = FILTROS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const f of FILTROS) {
      expect(f.css).not.toContain("url(");
      expect(f.css).not.toContain(";");
    }
  });
  it("'meu' não pode ser id do catálogo: é o filtro da pessoa", () => {
    expect(FILTROS.some((f) => f.id === "meu")).toBe(false);
  });
  it("filtro de beleza pede pele suave; filtro divertido não", () => {
    expect(suavidadeDoFiltro("suave")).toBeGreaterThan(0);
    expect(suavidadeDoFiltro("porcelana")).toBeGreaterThan(suavidadeDoFiltro("vico"));
    expect(suavidadeDoFiltro("pb")).toBe(0);
    expect(suavidadeDoFiltro("natural")).toBe(0);
  });
  it("nenhum filtro de beleza usa blur de CSS, que borra olho e boca junto", () => {
    for (const f of FILTROS) expect(f.css).not.toContain("blur(");
  });
  it("id desconhecido cai no natural, não quebra", () => {
    expect(filtroCss("nao-existe")).toBe("none");
  });
});
