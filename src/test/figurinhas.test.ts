import { describe, expect, it } from "vitest";
import {
  FIGURINHAS,
  figurinhaDe,
  mesmoInteresse,
  procurarFigurinhas,
} from "@/lib/figurinhas";
import { FUNDOS, estiloDoFundo, fundoPorId, tomDoFundo } from "@/lib/fundos";

describe("figurinha de um interesse", () => {
  it("acha a figurinha exata", () => {
    expect(figurinhaDe("café")).toBe("☕");
    expect(figurinhaDe("Café")).toBe("☕");
    expect(figurinhaDe("CAFE")).toBe("☕");
  });
  it("entende interesse escrito à mão", () => {
    expect(figurinhaDe("cafezinho da tarde")).toBe("☕");
    expect(figurinhaDe("corrida de rua")).toBe("🏃");
    expect(figurinhaDe("ler antes de dormir")).toBe("📚");
  });
  it("nunca deixa um interesse sem figurinha", () => {
    expect(figurinhaDe("xadrez persa do século XII")).toBe("✨");
    expect(figurinhaDe("")).toBe("✨");
  });
  it("toda figurinha do catálogo tem nome e grupo", () => {
    for (const f of FIGURINHAS) {
      expect(f.nome.length).toBeGreaterThan(1);
      expect(f.fig.length).toBeGreaterThan(0);
      expect(f.grupo.length).toBeGreaterThan(2);
    }
  });
  it("não repete interesse no catálogo", () => {
    const nomes = FIGURINHAS.map((f) => f.nome);
    expect(new Set(nomes).size).toBe(nomes.length);
  });
});

describe("mesmo interesse", () => {
  it("ignora acento e maiúscula", () => {
    expect(mesmoInteresse("música", "Musica")).toBe(true);
    expect(mesmoInteresse("café", "cha")).toBe(false);
  });
});

describe("procurar figurinha", () => {
  it("acha sem acento", () => {
    expect(procurarFigurinhas("musica").map((f) => f.nome)).toContain("música");
  });
  it("devolve tudo quando não há termo", () => {
    expect(procurarFigurinhas("")).toHaveLength(FIGURINHAS.length);
  });
});

describe("fundos", () => {
  it("todo fundo tem id único e declara o tom", () => {
    const ids = FUNDOS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const f of FUNDOS) expect(["claro", "escuro"]).toContain(f.tom);
  });
  it("os fundos de teia continuam com o prefixo, para não quebrar quem já escolheu", () => {
    const teias = FUNDOS.filter((f) => (f.grupo ?? "Teia") === "Teia");
    expect(teias.length).toBeGreaterThanOrEqual(8);
    for (const f of teias) expect(f.id.startsWith("teia-")).toBe(true);
  });
  it("tem bem mais que teia: degradê, tie-dye e estampa", () => {
    for (const g of ["Degradê", "Tie-dye", "Estampa"])
      expect(FUNDOS.filter((f) => f.grupo === g).length).toBeGreaterThanOrEqual(5);
  });
  it("monta o estilo a partir do id, nunca de texto solto", () => {
    const e = estiloDoFundo("teia-mata");
    expect(e.backgroundColor).toBe("#07351F");
    expect(String(e.backgroundImage)).toContain("data:image/svg+xml");
  });
  it("id desconhecido não vira CSS", () => {
    const e = estiloDoFundo("javascript:alert(1)");
    expect(e.backgroundColor).toBeUndefined();
  });
  it("sem fundo escolhido, nada é pintado", () => {
    expect(estiloDoFundo("")).toEqual({});
    expect(fundoPorId("nao-existe")).toBe(null);
  });
  it("diz o tom para o texto não sumir", () => {
    expect(tomDoFundo("teia-mata")).toBe("escuro");
    expect(tomDoFundo("teia-papel")).toBe("claro");
    expect(tomDoFundo("")).toBe("claro");
    expect(tomDoFundo("alguem/foto.jpg")).toBe("escuro");
  });
});
