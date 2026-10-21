import { describe, expect, it } from "vitest";
import { formatCount, toStats } from "@/lib/follows";

describe("números do perfil", () => {
  it("escreve os números do jeito brasileiro", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(512)).toBe("512");
    expect(formatCount(1200)).toBe("1,2 mil");
    expect(formatCount(12400)).toBe("12 mil");
    expect(formatCount(2_500_000)).toBe("2,5 mi");
  });
  it("quando a pessoa esconde as contagens, não devolve número nenhum", () => {
    const hidden = toStats({
      followers: null,
      following: null,
      connections: null,
      tribos: null,
      posts: null,
      visible: false,
    });
    expect(hidden.visible).toBe(false);
    expect(hidden.followers).toBe(0);
  });
  it("quando estão à mostra, devolve os números", () => {
    const s = toStats({
      followers: 248,
      following: 512,
      connections: 30,
      tribos: 3,
      posts: 12,
      visible: true,
    });
    expect(s.visible).toBe(true);
    expect(s.followers).toBe(248);
    expect(s.tribos).toBe(3);
  });
  it("sem resposta do servidor, trata como escondido", () => {
    expect(toStats(null).visible).toBe(false);
  });
});
