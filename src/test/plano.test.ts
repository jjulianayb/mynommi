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
  it("grátis no teto de perfis ouve falar do Pro", () => {
    const f = fraseTetoDePerfis(false);
    expect(f).toContain("3 perfis");
    expect(f).toContain("9 por dia");
  });
  it("Pro no teto não recebe propaganda de si mesmo", () => {
    const f = fraseTetoDePerfis(true);
    expect(f).toContain("9 perfis");
    expect(f).not.toContain("Pro são");
  });
  it("teto de match explica o teto e a saída", () => {
    expect(fraseTetoDeMatch()).toContain("3 pessoas");
    expect(fraseTetoDeMatch()).toContain("não tem teto");
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
