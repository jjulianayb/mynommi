import { describe, expect, it } from "vitest";
import { corDoNome, iniciais } from "@/lib/sem-foto";

describe("iniciais", () => {
  it("usa o primeiro nome e o último", () => {
    expect(iniciais("Felipe Balestrin")).toBe("FB");
    expect(iniciais("Ana Gouveia")).toBe("AG");
    expect(iniciais("Ju Camargo Pinho")).toBe("JP");
  });
  it("com um nome só, uma letra", () => {
    expect(iniciais("Dudah")).toBe("D");
  });
  it("tira acento e põe em maiúscula", () => {
    expect(iniciais("ângela")).toBe("A");
  });
  it("sem nome, não inventa letra", () => {
    expect(iniciais("")).toBe("");
    expect(iniciais("   ")).toBe("");
    expect(iniciais("··")).toBe("");
  });
});

describe("cor do nome", () => {
  it("a mesma pessoa tem sempre a mesma cor", () => {
    expect(corDoNome("Felipe Balestrin")).toEqual(corDoNome("Felipe Balestrin"));
    expect(corDoNome("felipe balestrin")).toEqual(corDoNome("Felipe Balestrin"));
  });
  it("devolve par de cores legível", () => {
    for (const n of ["Ana", "Felipe", "Dudah", "Beatriz", "", "Zzz"]) {
      const c = corDoNome(n);
      expect(c.fundo).toMatch(/^#[0-9A-F]{6}$/i);
      expect(c.letra).toMatch(/^#[0-9A-F]{6}$/i);
      expect(c.fundo).not.toBe(c.letra);
    }
  });
});
