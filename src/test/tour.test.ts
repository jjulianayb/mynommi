import { describe, expect, it } from "vitest";
import {
  PASSOS_DO_TOUR,
  passosVisiveis,
  posicaoDoBalao,
  recorte,
  type Caixa,
} from "@/lib/tour";

const tela = { largura: 390, altura: 800 };
const balao = { largura: 320, altura: 160 };

describe("posição do balão", () => {
  it("fica embaixo do alvo quando há espaço", () => {
    const alvo: Caixa = { top: 100, left: 20, width: 350, height: 90 };
    const p = posicaoDoBalao(alvo, tela, balao, "abaixo");
    expect(p.lado).toBe("abaixo");
    expect(p.top).toBe(202);
  });
  it("sobe quando o alvo está colado no rodapé", () => {
    const alvo: Caixa = { top: 730, left: 20, width: 70, height: 60 };
    const p = posicaoDoBalao(alvo, tela, balao, "acima");
    expect(p.lado).toBe("acima");
    expect(p.top).toBe(558);
  });
  it("desce quando o alvo está colado no topo, mesmo preferindo subir", () => {
    const alvo: Caixa = { top: 4, left: 20, width: 70, height: 40 };
    expect(posicaoDoBalao(alvo, tela, balao, "acima").lado).toBe("abaixo");
  });
  it("nunca encosta na borda da tela", () => {
    const naEsquerda = posicaoDoBalao({ top: 300, left: 0, width: 40, height: 40 }, tela, balao);
    expect(naEsquerda.left).toBeGreaterThanOrEqual(12);
    const naDireita = posicaoDoBalao({ top: 300, left: 380, width: 40, height: 40 }, tela, balao);
    expect(naDireita.left + balao.largura).toBeLessThanOrEqual(tela.largura - 12);
  });
  it("cabe mesmo numa tela menor que o balão", () => {
    const p = posicaoDoBalao({ top: 10, left: 10, width: 20, height: 20 }, { largura: 200, altura: 120 }, balao);
    expect(p.top).toBeGreaterThanOrEqual(12);
    expect(p.left).toBeGreaterThanOrEqual(12);
  });
});

describe("passos", () => {
  it("pula o que não está na tela", () => {
    const vistos = passosVisiveis(PASSOS_DO_TOUR, (a) => a !== '[data-tour="pessoas"]');
    expect(vistos.find((p) => p.id === "pessoas")).toBeUndefined();
    expect(vistos.length).toBe(PASSOS_DO_TOUR.length - 1);
  });
  it("some inteiro quando nada existe, em vez de mostrar balão vazio", () => {
    expect(passosVisiveis(PASSOS_DO_TOUR, () => false)).toHaveLength(0);
  });
  it("todo passo tem alvo, título e texto", () => {
    for (const p of PASSOS_DO_TOUR) {
      expect(p.alvo).toMatch(/^\[data-tour=/);
      expect(p.titulo.length).toBeGreaterThan(3);
      expect(p.texto.length).toBeGreaterThan(20);
    }
  });
});

describe("holofote", () => {
  it("abre uma folga em volta do alvo", () => {
    expect(recorte({ top: 100, left: 50, width: 80, height: 40 })).toEqual({
      top: 92,
      left: 42,
      width: 96,
      height: 56,
    });
  });
});
