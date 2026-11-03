import { describe, expect, it } from "vitest";
import { perguntaDeDados } from "@/lib/pippo-dados";

describe("perguntaDeDados", () => {
  it("reconhece pergunta de dólar", () => {
    expect(perguntaDeDados("Qual o dólar hoje?")).toEqual({ tipo: "dolar" });
    expect(perguntaDeDados("cotação agora")).toEqual({ tipo: "dolar" });
  });
  it("reconhece clima com cidade", () => {
    expect(perguntaDeDados("qual o clima hoje em Ouro Preto?")).toEqual({
      tipo: "clima",
      cidade: "ouro preto",
    });
  });
  it("clima sem cidade cai em Belo Horizonte", () => {
    expect(perguntaDeDados("vai chover amanhã?")).toEqual({
      tipo: "clima",
      cidade: "Belo Horizonte",
    });
  });
  it("não confunde papo do app com dados", () => {
    expect(perguntaDeDados("como funciona o match?")).toBeNull();
    expect(perguntaDeDados("quantas pessoas vejo por dia?")).toBeNull();
    expect(perguntaDeDados("")).toBeNull();
  });
});
