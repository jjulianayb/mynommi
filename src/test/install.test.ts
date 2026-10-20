import { describe, expect, it } from "vitest";
import { platformOf, installSteps, isStandalone, shouldOffer, DISMISS_DAYS } from "@/lib/install";

describe("instalar na tela de início", () => {
  it("reconhece Android, iPhone e computador", () => {
    expect(platformOf("Mozilla/5.0 (Linux; Android 14)")).toBe("android");
    expect(platformOf("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")).toBe("ios");
    expect(platformOf("Mozilla/5.0 (Windows NT 10.0)")).toBe("desktop");
  });
  it("trata o iPad novo, que se apresenta como Mac", () => {
    expect(platformOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", 5)).toBe("ios");
    expect(platformOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", 0)).toBe("desktop");
  });
  it("dá um passo a passo em português para cada plataforma", () => {
    expect(installSteps("ios")[0]).toMatch(/Compartilhar/);
    expect(installSteps("android")[0]).toMatch(/pontinhos/);
    expect(installSteps("desktop")).toHaveLength(3);
  });
  it("não oferece nada quando já está instalado", () => {
    expect(isStandalone({ navigator: { standalone: true } })).toBe(true);
    expect(isStandalone({ matchMedia: () => ({ matches: true }) })).toBe(true);
    expect(isStandalone({ matchMedia: () => ({ matches: false }) })).toBe(false);
    expect(isStandalone({})).toBe(false);
  });
  it("respeita quem dispensou, por 30 dias", () => {
    const now = Date.parse("2026-10-20T00:00:00Z");
    expect(shouldOffer(null, now)).toBe(true);
    expect(shouldOffer("2026-10-19T00:00:00Z", now)).toBe(false);
    expect(shouldOffer(new Date(now - (DISMISS_DAYS + 1) * 86400000).toISOString(), now)).toBe(
      true,
    );
    expect(shouldOffer("qualquer coisa", now)).toBe(true);
  });
});
