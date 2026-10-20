import { describe, expect, it } from "vitest";
import { coverProblem, coverPath, isPreset, coverStyle, PRESET_BACKGROUNDS } from "@/lib/covers";

describe("capas e planos de fundo", () => {
  it("aceita imagem até 4 MB", () => {
    expect(coverProblem({ type: "image/jpeg", size: 1000 })).toBeNull();
    expect(coverProblem({ type: "image/gif", size: 1000 })).toMatch(/JPG/);
    expect(coverProblem({ type: "image/png", size: 5e6 })).toMatch(/4 MB/);
  });
  it("guarda na pasta de quem envia, separando perfil e teia", () => {
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
