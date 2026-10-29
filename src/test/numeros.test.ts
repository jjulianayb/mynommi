import { describe, expect, it } from "vitest";
import { oQueOsNumerosDizem, taxaDeVolta, type Numeros } from "@/lib/numeros";

const base: Numeros = {
  cadastrados: 40, entraramSemana: 5, ativosSemana: 20, ativosMes: 30,
  voltaram: 20, diasPorPessoa: 2.4, comFoto: 30, comInteresses: 35,
  amizades: 12, amizadesSemana: 3, conversas: 8, tribosVivas: 4,
  rolesFuturos: 1, storiesSemana: 6,
};

describe("taxa de volta", () => {
  it("é a fatia de quem voltou outro dia", () => {
    expect(taxaDeVolta(base)).toBe(50);
  });
  it("não divide por zero", () => {
    expect(taxaDeVolta({ ...base, cadastrados: 0, voltaram: 0 })).toBe(0);
  });
});

describe("o que os números dizem", () => {
  it("com pouca gente, não conclui nada", () => {
    expect(oQueOsNumerosDizem({ ...base, cadastrados: 3 })).toMatch(/Gente de menos/);
  });
  it("ninguém abrindo é o alarme, não o cadastro", () => {
    expect(oQueOsNumerosDizem({ ...base, ativosSemana: 0 })).toMatch(/alarme/);
  });
  it("gente entrando sem virar amizade aponta o match", () => {
    expect(oQueOsNumerosDizem({ ...base, amizades: 0 })).toMatch(/match é o gargalo/);
  });
  it("pouca gente voltando manda descobrir por quê antes de crescer", () => {
    expect(oQueOsNumerosDizem({ ...base, voltaram: 2 })).toMatch(/por quê/);
  });
  it("amizade sem conversa aponta o depois do match", () => {
    expect(oQueOsNumerosDizem({ ...base, conversas: 0 })).toMatch(/depois do match/);
  });
  it("só libera crescer quando tudo anda", () => {
    expect(oQueOsNumerosDizem(base)).toMatch(/trazer mais/);
  });
  it("nunca chama cadastro de sucesso", () => {
    for (const n of [base, { ...base, amizades: 0 }, { ...base, ativosSemana: 0 }])
      expect(oQueOsNumerosDizem(n)).not.toMatch(/parabéns|sucesso/i);
  });
});
