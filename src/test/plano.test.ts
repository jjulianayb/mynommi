import { describe, expect, it } from "vitest";
import {
  DIAS_DE_PIPPIN,
  MATCHES_GRATIS,
  PERFIS_GRATIS_POR_DIA,
  PERFIS_PRO_POR_DIA,
  TRIBOS_PRO,
  fraseTetoDeMatch,
  fraseTetoDePerfis,
  fraseTetoDeTribos,
  fraseValidadePippins,
} from "@/lib/plano";

describe("os números do plano são os que a Ju decidiu", () => {
  it("3 perfis no grátis, 9 no Pro, 3 matches no grátis, 3 tribos no Pro, 90 dias de Pippin", () => {
    expect(PERFIS_GRATIS_POR_DIA).toBe(3);
    expect(PERFIS_PRO_POR_DIA).toBe(9);
    expect(MATCHES_GRATIS).toBe(3);
    expect(TRIBOS_PRO).toBe(3);
    expect(DIAS_DE_PIPPIN).toBe(90);
  });
});

describe("o aviso de teto convida sem empurrar", () => {
  // Os testes conferem o **sentido**, não a redação: a frase vai ser reescrita
  // muitas vezes (já foi), e teste colado na palavra exata vira obstáculo em
  // vez de rede. O que não pode mudar é o número ser o real e o Pro não virar
  // propaganda em cima de quem já paga.
  it("grátis no teto diz quantas teve e o que o Pro muda", () => {
    const f = fraseTetoDePerfis(false);
    expect(f).toContain(String(PERFIS_GRATIS_POR_DIA));
    expect(f).toContain(String(PERFIS_PRO_POR_DIA));
    expect(f).toMatch(/Pro/);
  });
  it("Pro no teto não recebe propaganda de si mesmo", () => {
    const f = fraseTetoDePerfis(true);
    expect(f).toContain(String(PERFIS_PRO_POR_DIA));
    expect(f.match(/Pro/g) ?? []).toHaveLength(0);
  });
  it("teto de match explica o teto e a saída", () => {
    const f = fraseTetoDeMatch();
    expect(f).toContain(String(MATCHES_GRATIS));
    expect(f).toMatch(/não tem limite|sem limite|não tem teto/);
  });
  it("nenhum aviso de teto fala com a pessoa no feminino", () => {
    // A nommi é de amizades e tribos, não uma rede só de mulheres.
    for (const f of [fraseTetoDePerfis(true), fraseTetoDePerfis(false), fraseTetoDeMatch()]) {
      expect(/\bamigas?\b|\bela\b|\bmulher/i.test(f), f).toBe(false);
    }
  });
  it("teto de tribo cita o número", () => {
    expect(fraseTetoDeTribos()).toContain("3 tribos");
  });
});

describe("a carteira avisa a validade sem assustar", () => {
  it("sem nada a vencer, lembra a regra", () => {
    expect(fraseValidadePippins(0, null)).toBe("Pippins de presente valem 90 dias. Pippin comprado não vence.");
  });
  it("com Pippins a vencer, diz quantos e até quando", () => {
    const f = fraseValidadePippins(8, new Date("2027-02-01T12:00:00-03:00"));
    expect(f).toContain("8 Pippins");
    expect(f).toContain("Pippin comprado não vence");
  });
  it("singular fica no singular", () => {
    expect(fraseValidadePippins(1, new Date("2027-02-01T12:00:00-03:00"))).toContain("1 Pippin vence");
  });
});
