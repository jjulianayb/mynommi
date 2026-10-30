import { describe, expect, it } from "vitest";
import {
  TITULO_VAZIO,
  convidaMais,
  fraseDosConvites,
  selodeEmbaixadora,
  type Titulo,
} from "@/lib/embaixadora";

const t = (extra: Partial<Titulo> = {}): Titulo => ({ ...TITULO_VAZIO, ...extra });

describe("o título de embaixadora", () => {
  it("quem não é, não vê selo nenhum", () => {
    expect(selodeEmbaixadora(t())).toBe("");
  });
  it("mostra o número, que é o que o título tem de bonito", () => {
    expect(selodeEmbaixadora(t({ embaixadora: true, numero: 7 }))).toBe("Embaixadora nº 7");
  });
  it("sem número, ainda é embaixadora", () => {
    expect(selodeEmbaixadora(t({ embaixadora: true }))).toBe("Embaixadora");
  });
});

describe("o contador conta quem ficou, não quem foi chamado", () => {
  it("zero não acusa a pessoa de nada", () => {
    const f = fraseDosConvites(0);
    expect(f).toContain("ainda");
    expect(/você não|deveria|precisa/i.test(f)).toBe(false);
  });
  it("a frase diz que a pessoa ficou, não que o convite foi mandado", () => {
    expect(fraseDosConvites(1)).toContain("ficou");
    expect(fraseDosConvites(4)).toContain("ficaram");
    for (const n of [0, 1, 4, 20]) expect(/mandad|enviad/i.test(fraseDosConvites(n))).toBe(false);
  });
  it("o incentivo nunca é pressão nem promessa de prêmio", () => {
    for (const n of [0, 2, 9]) {
      const c = convidaMais(n);
      expect(/ganhe|prêmio|desconto|grátis|pontos/i.test(c)).toBe(false);
      expect(c.length).toBeGreaterThan(10);
    }
  });
  it("quem está começando é lembrado do que o convite dá de verdade", () => {
    expect(convidaMais(0)).toContain("conectada");
  });
});
