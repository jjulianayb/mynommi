import { describe, expect, it } from "vitest";
import {
  janelaAberta,
  fraseDaPresenca,
  recadoDaConfirmacao,
  LIMITE_SEMANAL,
  type Presenca,
} from "@/lib/presenca";

const base: Presenca = {
  userId: "b",
  nickname: "Bia",
  avatar: "",
  declarou: "2026-10-21T20:00:00Z",
  confirmada: false,
  premiada: false,
  souEu: false,
};

describe("presença e estrela", () => {
  it("só dá para confirmar depois do rolê e dentro de sete dias", () => {
    const agora = Date.parse("2026-10-22T12:00:00Z");
    expect(janelaAberta("2026-10-21T20:00:00Z", agora)).toBe(true);
    expect(janelaAberta("2026-10-23T20:00:00Z", agora)).toBe(false);
    expect(janelaAberta("2026-10-10T20:00:00Z", agora)).toBe(false);
    expect(janelaAberta(null, agora)).toBe(false);
  });
  it("explica o estado de cada presença", () => {
    expect(fraseDaPresenca(base)).toMatch(/Falta alguém confirmar/);
    expect(fraseDaPresenca({ ...base, confirmada: true })).toBe("Presença confirmada");
    expect(fraseDaPresenca({ ...base, confirmada: true, premiada: true })).toMatch(/estrela/);
  });
  it("traduz a resposta do servidor", () => {
    expect(recadoDaConfirmacao("estrela", "Bia")).toMatch(/ganhou uma estrela/);
    expect(recadoDaConfirmacao("ja_confirmada", "Bia")).toMatch(/já estava/);
    expect(recadoDaConfirmacao("sem_declaracao", "Bia")).toMatch(/ainda não disse/);
    expect(recadoDaConfirmacao("nao_pode", "Bia")).toMatch(/organizou/);
  });
  it("o teto semanal é três", () => {
    expect(LIMITE_SEMANAL).toBe(3);
  });
});
