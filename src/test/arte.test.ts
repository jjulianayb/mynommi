import { describe, expect, it } from "vitest";
import {
  CORES,
  ESCALA_MAX,
  FIGURINHAS,
  FONTES,
  MAX_TEXTO,
  desenharArte,
  figurinhaPorId,
  fonteDoCanvas,
  itemNovo,
  limparItem,
  limparTexto,
  tamanhoDaLetra,
  textoDoItem,
  type Item,
} from "@/lib/arte";

const base = (extra: Partial<Item> = {}) => limparItem({ tipo: "texto", valor: "oi", ...extra })!;

describe("o que a pessoa escreve nunca vira estilo", () => {
  it("a fonte é id conferido; inventada cai na primeira", () => {
    expect(base({ fonte: "'; background:url(x)" }).fonte).toBe(FONTES[0]!.id);
    expect(fonteDoCanvas(base({ fonte: "mao" }), 1000)).toContain("Caveat");
    expect(fonteDoCanvas(base(), 1000)).not.toContain("url(");
  });
  it("a cor é do catálogo; inventada cai no branco", () => {
    expect(base({ cor: "red; content:'x'" }).cor).toBe(CORES[0]);
    expect(base({ cor: "#FFB400" }).cor).toBe("#FFB400");
  });
  it("o texto perde quebra de linha e comando, e tem tamanho máximo", () => {
    expect(limparTexto("oi\n\ttudo   bem")).toBe("oi tudo bem");
    expect(limparTexto("a".repeat(300)).length).toBe(MAX_TEXTO);
  });
  it("texto vazio não vira item", () => {
    expect(limparItem({ tipo: "texto", valor: "   " })).toBe(null);
  });
  it("figurinha fora do catálogo não vira item", () => {
    expect(limparItem({ tipo: "figurinha", valor: "nao-existe" })).toBe(null);
    expect(limparItem({ tipo: "figurinha", valor: "chifrinho" })).not.toBe(null);
  });
});

describe("a posição é fração, não pixel", () => {
  it("fica entre 0 e 1 mesmo se vier absurdo", () => {
    const i = base({ x: 50, y: -3 });
    expect(i.x).toBe(1);
    expect(i.y).toBe(0);
  });
  it("a mesma fração cai no mesmo lugar em qualquer tamanho", () => {
    const i = base({ x: 0.25 });
    expect(i.x * 390).toBeCloseTo(97.5);
    expect(i.x * 1280).toBeCloseTo(320);
  });
  it("a letra cresce junto com a foto", () => {
    expect(tamanhoDaLetra(1, 1280)).toBeGreaterThan(tamanhoDaLetra(1, 390));
  });
  it("escala e giro têm limite", () => {
    expect(base({ escala: 99 }).escala).toBe(ESCALA_MAX);
    expect(base({ giro: 900 }).giro).toBe(45);
  });
});

describe("o catálogo de figurinhas", () => {
  it("não repete id", () => {
    const ids = FIGURINHAS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("tem o chifrinho que a Ju pediu", () => {
    expect(figurinhaPorId("chifrinho")).not.toBe(null);
  });
  it("palavra de quadrinho mostra a palavra", () => {
    expect(textoDoItem(limparItem({ tipo: "figurinha", valor: "pa" })!)).toBe("PÁ!");
  });
  it("item novo nasce no meio da foto", () => {
    const i = itemNovo("figurinha", "raio")!;
    expect(i.x).toBe(0.5);
    expect(i.y).toBe(0.5);
  });
});

describe("carimbar a arte na foto", () => {
  function espiao() {
    const chamadas: string[] = [];
    const ctx = {
      save: () => chamadas.push("save"),
      restore: () => chamadas.push("restore"),
      translate: () => {},
      rotate: () => {},
      measureText: () => ({ width: 40 }),
      beginPath: () => {},
      rect: () => {},
      roundRect: () => {},
      fill: () => {},
      fillText: (t: string) => chamadas.push("fill:" + t),
      strokeText: (t: string) => chamadas.push("stroke:" + t),
      set font(v: string) {
        chamadas.push("font:" + v);
      },
      set fillStyle(_v: string) {},
      set strokeStyle(_v: string) {},
      set lineWidth(_v: number) {},
      set lineJoin(_v: string) {},
      set textAlign(_v: string) {},
      set textBaseline(_v: string) {},
    } as unknown as CanvasRenderingContext2D;
    return { ctx, chamadas };
  }

  it("desenha o texto e a figurinha", () => {
    const { ctx, chamadas } = espiao();
    desenharArte(ctx, 1000, 1333, [
      base({ valor: "bom dia" }),
      limparItem({ tipo: "figurinha", valor: "chifrinho" })!,
    ]);
    expect(chamadas).toContain("fill:bom dia");
    expect(chamadas).toContain("fill:😈");
  });
  it("item inválido é pulado em vez de quebrar a foto", () => {
    const { ctx, chamadas } = espiao();
    desenharArte(ctx, 1000, 1333, [{ tipo: "figurinha", valor: "nao-existe" } as Item]);
    expect(chamadas.filter((c) => c.startsWith("fill:"))).toHaveLength(0);
  });
  it("todo save tem o seu restore", () => {
    const { ctx, chamadas } = espiao();
    desenharArte(ctx, 1000, 1333, [base(), base({ estilo: "caixa" })]);
    expect(chamadas.filter((c) => c === "save").length).toBe(
      chamadas.filter((c) => c === "restore").length,
    );
  });
});
