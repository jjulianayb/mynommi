import { describe, expect, it } from "vitest";
import { nascimentoDoCadastro, precisaAceitar } from "@/lib/aceite";
import { portaDaTribo, recadoDaPorta } from "@/lib/porta-da-tribo";
import { nomeDoArquivo } from "@/components/friends/meus-dados";

const V = "2026-10-29";

describe("quem precisa aceitar de novo", () => {
  it("quem nunca aceitou precisa", () => {
    expect(precisaAceitar([], V)).toBe(true);
  });
  it("quem aceitou só os termos ainda precisa da privacidade", () => {
    expect(precisaAceitar([{ documento: "termos", versao: V }], V)).toBe(true);
  });
  it("quem aceitou um texto antigo precisa ver o novo", () => {
    const velhos = [
      { documento: "termos", versao: "2026-01-01" },
      { documento: "privacidade", versao: "2026-01-01" },
    ];
    expect(precisaAceitar(velhos, V)).toBe(true);
  });
  it("quem já aceitou a versão do ar não vê nada", () => {
    const emDia = [
      { documento: "termos", versao: V },
      { documento: "privacidade", versao: V },
    ];
    expect(precisaAceitar(emDia, V)).toBe(false);
  });
});

describe("a data de nascimento que já estava no cadastro", () => {
  it("aproveita a do cadastro", () => {
    expect(nascimentoDoCadastro({ birthday: "1990-05-12" })).toBe("1990-05-12");
  });
  it("ignora o que não é data", () => {
    expect(nascimentoDoCadastro({ birthday: "ontem" })).toBe(null);
    expect(nascimentoDoCadastro({})).toBe(null);
    expect(nascimentoDoCadastro(undefined)).toBe(null);
  });
});

describe("a porta de uma tribo sensível", () => {
  const base = { souMembro: false, souCriadora: false, entrada: "aberta" as const, meuPedido: null };
  it("pede consentimento antes de qualquer coisa", () => {
    expect(portaDaTribo({ ...base, sensivel: true, jaConsenti: false })).toBe("consentir");
  });
  it("tribo fechada e sensível pede o consentimento primeiro, não o pedido", () => {
    expect(
      portaDaTribo({ ...base, entrada: "fechada", sensivel: true, jaConsenti: false }),
    ).toBe("consentir");
  });
  it("depois de consentir, volta a ser uma porta comum", () => {
    expect(portaDaTribo({ ...base, sensivel: true, jaConsenti: true })).toBe("entrar");
  });
  it("quem já está dentro não é perguntado de novo", () => {
    expect(portaDaTribo({ ...base, souMembro: true, sensivel: true, jaConsenti: false })).toBe(
      "dentro",
    );
  });
  it("tribo comum não muda de comportamento", () => {
    expect(portaDaTribo(base)).toBe("entrar");
  });
  it("o recado nunca diz qual é a opinião da pessoa", () => {
    const r = recadoDaPorta("consentir");
    expect(r).toContain("escolha sua");
    expect(/esquerda|direita|religi|gay|LGBT/i.test(r)).toBe(false);
  });
});

describe("o arquivo que a pessoa leva embora", () => {
  it("tem a data no nome, para ela saber de quando é", () => {
    expect(nomeDoArquivo(new Date("2026-10-29T12:00:00Z"))).toBe("nommi-meus-dados-2026-10-29.json");
  });
});
