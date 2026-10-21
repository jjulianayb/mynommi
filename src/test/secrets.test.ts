import { describe, expect, it } from "vitest";
import { cleanSecret, timeLeft, expiresIn, PRAZOS, MAX_SECRET } from "@/lib/secrets";

describe("Só entre nós", () => {
  it("aceita de 1 a 500 letras", () => {
    expect(cleanSecret("  contei  ")).toBe("contei");
    expect(cleanSecret("   ")).toBeNull();
    expect(cleanSecret("a".repeat(MAX_SECRET))).toHaveLength(500);
    expect(cleanSecret("a".repeat(501))).toBeNull();
  });
  it("diz quanto falta para sumir", () => {
    const agora = Date.parse("2026-10-21T12:00:00Z");
    expect(timeLeft("2026-10-21T20:00:00Z", agora)).toBe("some em 8 h");
    expect(timeLeft("2026-10-22T13:00:00Z", agora)).toBe("some amanhã");
    expect(timeLeft("2026-10-28T12:00:00Z", agora)).toBe("some em 7 dias");
    expect(timeLeft("2026-10-20T12:00:00Z", agora)).toBe("sumindo agora");
  });
  it("calcula o prazo a partir de hoje", () => {
    const agora = Date.parse("2026-10-21T12:00:00Z");
    expect(expiresIn(7, agora)).toBe("2026-10-28T12:00:00.000Z");
  });
  it("oferece prazos curtos, nunca para sempre", () => {
    expect(PRAZOS.map((p) => p.dias)).toEqual([1, 7, 30]);
    expect(Math.max(...PRAZOS.map((p) => p.dias))).toBeLessThanOrEqual(30);
  });
});
