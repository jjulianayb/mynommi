import { describe, expect, it } from "vitest";
import { isRealHost, presentationDemo, signupDetails } from "@/lib/nommi-access";
import { demoState, emptyState } from "@/lib/friends-data";
import { hasSharedTeia, joinTeia, teiasFor } from "@/lib/tribos";

const details = {
  nickname: "Ju",
  city: "Recife",
  birthday: "2008-10-11",
  interests: ["café", "livros", "cinema"],
};
const today = new Date("2026-10-11T12:00:00");
describe("Entrada e participação Nommi", () => {
  it("aceita 18 anos completos e rejeita 17", () => {
    expect(signupDetails(details, today).data?.birthday).toBe("2008-10-11");
    expect(signupDetails({ ...details, birthday: "2008-10-12" }, today).data).toBeUndefined();
  });
  it("pede de 3 a 6 interesses distintos", () => {
    expect(signupDetails(details, today).data?.interests).toHaveLength(3);
    // Quatro, cinco e seis passam: o cadastro continua curto e a fila melhora.
    const seis = ["café", "livros", "cinema", "games", "trilhas", "música"];
    expect(signupDetails({ ...details, interests: seis }, today).data?.interests).toHaveLength(6);
    for (const interests of [
      ["café"],
      ["café", "café", "livros"],
      [...seis, "vinho"],
    ]) {
      expect(signupDetails({ ...details, interests }, today).data).toBeUndefined();
    }
  });
  it("reserva o painel e créditos a anfitrião real, nunca demo", () => {
    expect(isRealHost({ isBusiness: true }, false)).toBe(true);
    expect(isRealHost({ isBusiness: true }, true)).toBe(false);
    expect(isRealHost({ isBusiness: false }, false)).toBe(false);
    expect(isRealHost(null, false)).toBe(false);
  });
  it("permite apresentação somente com demo=1", () => {
    expect(presentationDemo("?demo=1")).toBe(true);
    expect(presentationDemo("")).toBe(false);
    expect(presentationDemo("?demo=0")).toBe(false);
  });
  it("inclui tribos recém-entradas nos seletores, sem as três originais por padrão", () => {
    expect(teiasFor(emptyState)).toEqual([]);
    expect(teiasFor(joinTeia(emptyState, 3)).map((t) => t.id)).toEqual([3]);
  });
  it("chat exige participação anterior na mesma tribo, não curiosidade ou simples entrada", () => {
    expect(hasSharedTeia({ ...emptyState, matches: [7] }, 7)).toBe(false);
    expect(hasSharedTeia(joinTeia(emptyState, 3), 4)).toBe(false);
    expect(hasSharedTeia(demoState, 7)).toBe(true);
    expect(hasSharedTeia({ ...demoState, blocked: [7] }, 7)).toBe(false);
  });
});
