import { describe, expect, it } from "vitest";
import { CATALOGO_DE_SELOS, figuraDoSelo, recadoDosSelos, type Selo } from "@/lib/selos";

const s = (selo: string, quantos = 1, euDei = false): Selo => ({ selo, quantos, euDei });

describe("catálogo de selos", () => {
  it("não repete selo", () => {
    const nomes = CATALOGO_DE_SELOS.map((x) => x.selo);
    expect(new Set(nomes).size).toBe(nomes.length);
  });
  it("todo selo é sobre como a pessoa é, nunca aparência", () => {
    const proibido = /bonit|feio|magr|gord|velh|nov[ao]\b/i;
    for (const x of CATALOGO_DE_SELOS) expect(x.selo).not.toMatch(proibido);
  });
  it("todo selo tem figura e cabe no limite do banco", () => {
    for (const x of CATALOGO_DE_SELOS) {
      expect(x.fig.length).toBeGreaterThan(0);
      expect(x.selo.length).toBeGreaterThanOrEqual(2);
      expect(x.selo.length).toBeLessThanOrEqual(40);
    }
  });
});

describe("figura do selo", () => {
  it("acha a do catálogo", () => {
    expect(figuraDoSelo("faz rir")).toBe("😂");
    expect(figuraDoSelo("FAZ RIR")).toBe("😂");
  });
  it("selo de fora ganha estrela", () => {
    expect(figuraDoSelo("qualquer outra coisa")).toBe("⭐");
  });
});

describe("recado dos selos", () => {
  it("convida quando não tem nenhum", () => {
    expect(recadoDosSelos([], "Marina")).toContain("Ninguém carimbou");
  });
  it("conta quantas pessoas, não quantos selos", () => {
    expect(recadoDosSelos([s("faz rir", 2)], "Marina")).toContain("2");
  });
  it("muda de tom quando já tem gente o bastante", () => {
    expect(recadoDosSelos([s("faz rir", 3)], "Marina")).toContain("já disseram");
  });
});
