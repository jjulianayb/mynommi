import { describe, expect, it } from "vitest";
import {
  FILTROS,
  FILTRO_PADRAO,
  filtroCss,
  filtroPorId,
  filtrosDoGrupo,
  quantoFalta,
  tamanhoDoStory,
  venceEm,
  HORAS_NO_AR,
} from "@/lib/camera";
import { enderecoDaImagem } from "@/lib/covers";
import { estiloDoFundo, tomDoFundo } from "@/lib/fundos";

describe("filtros", () => {
  it("não repete id", () => {
    const ids = FILTROS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("tem filtro de beleza e de divertido", () => {
    expect(filtrosDoGrupo("Beleza").length).toBeGreaterThan(2);
    expect(filtrosDoGrupo("Divertido").length).toBeGreaterThan(2);
  });
  it("id desconhecido cai no natural, nunca em texto solto", () => {
    expect(filtroPorId("url(javascript:alert(1))").id).toBe(FILTRO_PADRAO);
    expect(filtroCss("nao-existe")).toBe("none");
  });
  it("todo filtro é só função de CSS, sem url nem ponto e vírgula", () => {
    for (const f of FILTROS) expect(f.css).toMatch(/^(none|[a-z-]+\([^;{}]*\)( [a-z-]+\([^;{}]*\))*)$/);
  });
});

describe("validade de uma hora", () => {
  it("vence em uma hora", () => {
    const agora = new Date("2026-10-23T12:00:00Z");
    expect(venceEm(agora)).toBe("2026-10-23T13:00:00.000Z");
    expect(HORAS_NO_AR).toBe(1);
  });
  it("diz quanto falta em minutos", () => {
    const agora = Date.parse("2026-10-23T12:00:00Z");
    expect(quantoFalta("2026-10-23T12:40:00Z", agora)).toBe("some em 40 min");
    expect(quantoFalta("2026-10-23T13:00:00Z", agora)).toBe("some em 1 h");
    expect(quantoFalta("2026-10-23T11:00:00Z", agora)).toBe("acabou");
  });
});

describe("tamanho do story", () => {
  it("diminui foto grande mantendo a proporção", () => {
    expect(tamanhoDoStory(2160, 3840)).toEqual({ w: 720, h: 1280 });
  });
  it("não aumenta foto pequena", () => {
    expect(tamanhoDoStory(480, 640)).toEqual({ w: 480, h: 640 });
  });
});

describe("endereço de imagem", () => {
  it("usa como está o que já é endereço", () => {
    expect(enderecoDaImagem("data:image/jpeg;base64,abc")).toBe("data:image/jpeg;base64,abc");
    expect(enderecoDaImagem("https://x/y.jpg")).toBe("https://x/y.jpg");
    expect(enderecoDaImagem("blob:http://x/1")).toBe("blob:http://x/1");
  });
  it("id que não é caminho de arquivo nunca vira URL", () => {
    expect(enderecoDaImagem("teia-verde")).toBe("");
    expect(enderecoDaImagem("")).toBe("");
  });
});

describe("fundo antigo", () => {
  it("quem escolheu um gradiente antigo continua com ele", () => {
    expect(estiloDoFundo("teia-verde").background).toContain("linear-gradient");
    expect(estiloDoFundo("teia-verde").backgroundImage).toBeUndefined();
  });
  it("e o texto continua legível", () => {
    expect(tomDoFundo("teia-verde")).toBe("escuro");
    expect(tomDoFundo("papel")).toBe("claro");
  });
});
