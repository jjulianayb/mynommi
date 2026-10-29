import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PRAZOS, VERSAO_DOS_TEXTOS, prometeDemais, quemResponde } from "@/lib/politica";

const legal = readFileSync("src/components/friends/settings.tsx", "utf8");
const inicio = legal.indexOf("Quem cuida dos seus dados");
const fim = legal.indexOf("desta versão está no começo da página");
const privacidade = legal.slice(inicio, fim);

describe("a política não pode mentir", () => {
  it("nunca afirma que os dados ficam no aparelho", () => {
    expect(prometeDemais(privacidade)).toBe(false);
  });
  it("diz onde os dados ficam", () => {
    expect(privacidade).toContain("não no seu");
    expect(privacidade).toContain("fora do Brasil");
  });
  it("informa, não se desculpa: nada de confessar o texto antigo para quem nunca o viu", () => {
    const aviso = readFileSync("src/components/friends/aceite.tsx", "utf8");
    expect(/não é verdade|mentira|erro nosso|a gente errou|reescrev/i.test(aviso)).toBe(false);
    expect(aviso).toContain("Atualizamos os Termos");
  });
  it("não chama a nommi de demonstração em nenhum texto legal", () => {
    expect(/demonstra[çc]/i.test(privacidade)).toBe(false);
  });
});

describe("quem responde", () => {
  it("enquanto o registro não sai, admite isso em vez de inventar um nome", () => {
    const frase = quemResponde({ tipo: "em_registro", nome: "", documento: "", endereco: "", email: "x@y" });
    expect(frase).toContain("registro da empresa em andamento");
    expect(frase).not.toContain("CNPJ undefined");
  });
  it("com a empresa registrada, nomeia a empresa e o CNPJ", () => {
    const frase = quemResponde({
      tipo: "empresa", nome: "nommi LTDA", documento: "00.000.000/0001-00",
      endereco: "São Paulo, SP", email: "x@y",
    });
    expect(frase).toContain("nommi LTDA");
    expect(frase).toContain("00.000.000/0001-00");
  });
  it("com pessoa física, diz que é provisório", () => {
    const frase = quemResponde({ tipo: "pessoa", nome: "Fulana", documento: "", endereco: "", email: "x@y" });
    expect(frase).toContain("enquanto o registro da empresa não sai");
  });
});

describe("prazos", () => {
  it("todo prazo tem um tempo escrito, nunca 'a definir'", () => {
    for (const p of PRAZOS) {
      expect(p.quanto.length).toBeGreaterThan(3);
      expect(/a definir|TBD|\[/i.test(p.quanto)).toBe(false);
    }
  });
  it("a versão é uma data, porque é ela que fica gravada no aceite", () => {
    expect(VERSAO_DOS_TEXTOS).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
