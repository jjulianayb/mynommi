import { describe, expect, it } from "vitest";
import {
  RECADO_DO_PEDIDO,
  confereSenhaNova,
  modoDaRecuperacao,
  recadoDoErro,
} from "@/lib/senha";

describe("qual tela aparece", () => {
  it("sem link, pede o e-mail", () => {
    expect(modoDaRecuperacao("", "")).toBe("pedir");
    expect(modoDaRecuperacao("#access_token=abc", "")).toBe("pedir");
  });
  it("com o link de recuperação, deixa escolher a senha", () => {
    expect(modoDaRecuperacao("#access_token=abc&type=recovery", "")).toBe("escolher");
    expect(modoDaRecuperacao("", "?type=recovery&code=1")).toBe("escolher");
  });
});

describe("o recado de quem pediu o link", () => {
  it("não entrega se o e-mail tem conta ou não", () => {
    expect(RECADO_DO_PEDIDO).toContain("Se esse e-mail tiver conta");
    expect(/não existe|não encontrado|não cadastrad/i.test(RECADO_DO_PEDIDO)).toBe(false);
  });
});

describe("a senha nova", () => {
  it("recusa senha curta", () => {
    expect(confereSenhaNova("Abc1", "Abc1")).toContain("8 caracteres");
  });
  it("pede maiúscula e minúscula", () => {
    expect(confereSenhaNova("abcdefg1", "abcdefg1")).toContain("maiúscula");
  });
  it("pede número", () => {
    expect(confereSenhaNova("AbcdefgH", "AbcdefgH")).toContain("número");
  });
  it("recusa quando as duas não batem", () => {
    expect(confereSenhaNova("Cafe-Domingo27", "Cafe-Domingo28")).toContain("não são iguais");
  });
  it("aceita uma senha boa", () => {
    expect(confereSenhaNova("Cafe-Domingo27", "Cafe-Domingo27")).toBe(null);
  });
});

describe("o recado do erro", () => {
  it("link vencido vira convite para pedir outro", () => {
    expect(recadoDoErro("Email link is invalid or has expired")).toContain("venceu");
  });
  it("erro desconhecido não despeja mensagem técnica", () => {
    const r = recadoDoErro("AuthApiError: 500 unexpected_failure");
    expect(r).toBe("Não deu para concluir agora. Tente de novo.");
  });
});
