import { describe, expect, it } from "vitest";
import {
  faltamPara,
  faseDaTribo,
  fraseDoPulso,
  novoCodigo,
  linkDoConvite,
  textoDoConvite,
} from "@/lib/chegada";

describe("chegada de quem acabou de entrar", () => {
  it("calcula quantas pessoas faltam para a roda", () => {
    expect(faltamPara(3, 12)).toBe(9);
    expect(faltamPara(15, 12)).toBe(0);
    expect(faltamPara(3, null)).toBeNull();
  });
  it("conta a fase da tribo sem inventar gente", () => {
    expect(faseDaTribo(0, 12)).toBe("Seja a primeira. Faltam 12 para a primeira roda");
    expect(faseDaTribo(5, 12)).toBe("5 pessoas · faltam 7 para a primeira roda");
    expect(faseDaTribo(12, 12)).toBe("Roda completa. Já dá para marcar");
    expect(faseDaTribo(1, null)).toBe("1 pessoa aqui");
  });
  it("resume o movimento real da semana", () => {
    expect(
      fraseDoPulso({
        pessoas: 9,
        tribos: 14,
        rolesAbertos: 2,
        encontrosMarcados: 0,
        mensagensSemana: 3,
        entraramSemana: 4,
      }),
    ).toBe("4 pessoas entraram numa tribo esta semana");
    expect(
      fraseDoPulso({
        pessoas: 9,
        tribos: 14,
        rolesAbertos: 1,
        encontrosMarcados: 0,
        mensagensSemana: 0,
        entraramSemana: 0,
      }),
    ).toBe("1 rolê aberto esperando gente");
    expect(
      fraseDoPulso({
        pessoas: 2,
        tribos: 14,
        rolesAbertos: 0,
        encontrosMarcados: 0,
        mensagensSemana: 0,
        entraramSemana: 0,
      }),
    ).toBe("14 tribos abertas, esperando as primeiras rodas");
  });
  it("gera código de convite legível, sem acento", () => {
    const c = novoCodigo("Juliana");
    expect(c).toMatch(/^JULIAN-[A-Z0-9]{4}$/);
    expect(novoCodigo("Açaí")).toMatch(/^ACAI-/);
    expect(novoCodigo("")).toMatch(/^NOMMI-/);
  });
  it("monta o link e o texto do convite", () => {
    const link = linkDoConvite("ANA-7K2P", "https://nommibr.com.br");
    expect(link).toBe("https://nommibr.com.br/conta?modo=criar&convite=ANA-7K2P");
    expect(textoDoConvite("Ana", link)).toContain(link);
    expect(textoDoConvite("Ana", link)).toContain("tribo");
  });
});
