import { describe, expect, it } from "vitest";
import { coverProblem, coverPath, isPreset, coverStyle, PRESET_BACKGROUNDS } from "@/lib/covers";

describe("capas e planos de fundo", () => {
  /**
   * O bug do iPhone, terceira vez (02/11): isto aceitava só jpeg, png e webp,
   * e capa de iPhone chega em HEIC. Quem tem iPhone não conseguia pôr capa
   * no perfil nem na tribo. Agora confere só se é imagem e deixa o canvas
   * converter — a mesma lição de 26/10 e dos posts.
   */
  it("aceita qualquer imagem que o celular mande, HEIC inclusive", () => {
    for (const t of ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"])
      expect(coverProblem({ type: t, size: 1000 }), t).toBeNull();
  });
  it("recusa o que não é imagem, sem listar formato", () => {
    const r = coverProblem({ type: "application/pdf", size: 1000 });
    expect(r).toBeTruthy();
    expect(/JPG|PNG|WebP|HEIC/i.test(r!)).toBe(false);
  });
  it("ainda tem teto, para o canvas não engasgar", () => {
    expect(coverProblem({ type: "image/jpeg", size: 60e6 })).toBeTruthy();
  });
  it("guarda na pasta de quem envia, separando perfil e tribo", () => {
    expect(
      coverPath("u1", "cover", "perfil", "image/jpeg", 10).startsWith("u1/perfil-cover-"),
    ).toBe(true);
    expect(coverPath("u1", "background", 7, "image/png", 10)).toBe("u1/teia-7-background-10.png");
  });
  it("reconhece os fundos prontos da nommi", () => {
    expect(isPreset("teia-verde")).toBe(true);
    expect(isPreset("u1/foto.jpg")).toBe(false);
    expect(PRESET_BACKGROUNDS.length).toBeGreaterThanOrEqual(5);
  });
  it("monta o estilo certo para fundo pronto e para foto", () => {
    expect(coverStyle("teia-verde").background).toContain("linear-gradient");
    expect(coverStyle("")).toEqual({});
    expect(coverStyle("u1/foto.jpg").backgroundSize).toBe("cover");
  });
});
