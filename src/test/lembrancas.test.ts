import { describe, expect, it } from "vitest";
import {
  MAX_LEGENDA,
  comQuemFoi,
  limparLegenda,
  quandoFoiORole,
  type Lembranca,
} from "@/lib/lembrancas";

const l = (extra: Partial<Lembranca> = {}): Lembranca => ({
  teiaId: 100010,
  nome: "Noite de karaokê",
  quando: "2026-10-24T23:00:00Z",
  cidade: "Belo Horizonte",
  foto: "",
  comQuem: "",
  legenda: "",
  guardada: false,
  ...extra,
});

describe("a frase da lembrança", () => {
  it("a frase da pessoa vem na frente de tudo", () => {
    expect(comQuemFoi(l({ legenda: "a gente não parou de rir", comQuem: "Ana" }))).toBe(
      "a gente não parou de rir",
    );
  });
  it("sem frase, diz com quem foi: é isso que vira lembrança", () => {
    expect(comQuemFoi(l({ comQuem: "Ana, Lu" }))).toBe("com Ana, Lu");
  });
  it("sozinha, ainda assim diz alguma coisa", () => {
    expect(comQuemFoi(l())).toBe("em Belo Horizonte");
    expect(comQuemFoi(l({ cidade: "" }))).toBe("você foi");
  });
});

describe("a data do rolê", () => {
  it("sai curta, em português", () => {
    expect(quandoFoiORole("2026-10-24T13:00:00Z")).toBe("24 out");
  });
  it("data quebrada não quebra a tela", () => {
    expect(quandoFoiORole("isso não é data")).toBe("");
  });
});

describe("a legenda que a pessoa escreve", () => {
  it("perde quebra de linha e comando", () => {
    expect(limparLegenda("fui\n\tcom a tribo")).toBe("fui com a tribo");
  });
  it("tem tamanho máximo", () => {
    expect(limparLegenda("a".repeat(400)).length).toBe(MAX_LEGENDA);
  });
});
