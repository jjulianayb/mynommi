import { describe, expect, it } from "vitest";
import {
  contador,
  quandoFoi,
  recadoDaTribo,
  temNovidade,
  type MinhaTribo,
} from "@/lib/minhas-tribos";

const tribo = (extra: Partial<MinhaTribo> = {}): MinhaTribo => ({
  id: 100001,
  nome: "Tribo dos Cafés",
  capa: "",
  membros: 5,
  ultimaFala: "",
  ultimoAutor: "",
  ultimaEm: null,
  naoLidas: 0,
  ...extra,
});

describe("o que a linha da tribo diz", () => {
  it("com fala, mostra quem falou na frente", () => {
    const r = recadoDaTribo(tribo({ ultimaFala: "alguém topa sexta?", ultimoAutor: "Ana" }));
    expect(r).toBe("Ana: alguém topa sexta?");
  });
  it("sem fala e com gente, convida em vez de acusar vazio", () => {
    expect(recadoDaTribo(tribo())).toContain("5 pessoas aqui");
  });
  it("sozinha na tribo, chama para dar um oi", () => {
    expect(recadoDaTribo(tribo({ membros: 1 }))).toContain("Dá um oi");
  });
  it("nunca cobra rolê: tribo não é encontro esperando acontecer", () => {
    for (const t of [tribo(), tribo({ membros: 1 }), tribo({ ultimaFala: "oi", ultimoAutor: "Lu" })])
      expect(/marcar|roda|encontro/i.test(recadoDaTribo(t))).toBe(false);
  });
});

describe("a cor muda só quando tem recado novo", () => {
  it("zero não lidas não muda nada", () => {
    expect(temNovidade(tribo())).toBe(false);
  });
  it("uma não lida já muda", () => {
    expect(temNovidade(tribo({ naoLidas: 1 }))).toBe(true);
  });
  it("o contador tem teto", () => {
    expect(contador(5)).toBe("5");
    expect(contador(1200)).toBe("99+");
    expect(contador(-3)).toBe("0");
  });
});

describe("há quanto tempo foi", () => {
  const agora = new Date("2026-10-29T20:00:00Z").getTime();
  const atras = (min: number) => new Date(agora - min * 60000).toISOString();
  it("fala do jeito que se fala", () => {
    expect(quandoFoi(atras(0), agora)).toBe("agora");
    expect(quandoFoi(atras(12), agora)).toBe("12 min");
    expect(quandoFoi(atras(200), agora)).toBe("3 h");
    expect(quandoFoi(atras(60 * 30), agora)).toBe("ontem");
    expect(quandoFoi(atras(60 * 24 * 4), agora)).toBe("4 d");
  });
  it("sem fala, não mostra tempo nenhum", () => {
    expect(quandoFoi(null, agora)).toBe("");
  });
});
