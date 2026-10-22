import { describe, expect, it } from "vitest";
import { CENTRO, limite, moverFoco, paraCss } from "@/lib/enquadrar";

describe("limite", () => {
  it("prende o valor entre 0 e 100", () => {
    expect(limite(-20)).toBe(0);
    expect(limite(140)).toBe(100);
    expect(limite(33.6)).toBe(34);
  });
  it("não deixa lixo virar regra de estilo", () => {
    expect(limite(Number.NaN)).toBe(50);
    expect(limite(Number.POSITIVE_INFINITY)).toBe(50);
  });
});

describe("paraCss", () => {
  it("monta a posição com dois números", () => {
    expect(paraCss(CENTRO)).toBe("50% 50%");
    expect(paraCss({ x: 999, y: -5 })).toBe("100% 0%");
  });
});

describe("moverFoco", () => {
  it("anda ao contrário do dedo", () => {
    const f = moverFoco(CENTRO, 50, 0, 200, 100);
    expect(f.x).toBe(25);
    expect(f.y).toBe(50);
  });
  it("não passa das bordas", () => {
    expect(moverFoco(CENTRO, -400, -400, 200, 100)).toEqual({ x: 100, y: 100 });
    expect(moverFoco(CENTRO, 400, 400, 200, 100)).toEqual({ x: 0, y: 0 });
  });
  it("sobrevive a uma moldura sem tamanho", () => {
    expect(moverFoco(CENTRO, 10, 10, 0, 0)).toEqual({ x: 0, y: 0 });
  });
});
