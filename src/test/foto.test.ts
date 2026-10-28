import { describe, expect, it } from "vitest";
import {
  ZOOM_MAX,
  escalaQueCobre,
  folga,
  limitarZoom,
  pedacoDaFoto,
  prenderNaMoldura,
  recadoDoEnvio,
} from "@/lib/foto";

describe("zoom", () => {
  it("fica entre o mínimo e o máximo", () => {
    expect(limitarZoom(0.2)).toBe(1);
    expect(limitarZoom(99)).toBe(ZOOM_MAX);
    expect(limitarZoom(Number.NaN)).toBe(1);
  });
});

describe("escala que cobre", () => {
  it("usa o lado menor, para a moldura nunca ficar com buraco", () => {
    expect(escalaQueCobre(1000, 500, 250)).toBe(0.5);
    expect(escalaQueCobre(500, 1000, 250)).toBe(0.5);
  });
  it("sobrevive a medidas zeradas", () => {
    expect(escalaQueCobre(0, 0, 250)).toBe(250);
  });
});

describe("arrastar dentro da moldura", () => {
  it("foto quadrada sem zoom não anda", () => {
    expect(prenderNaMoldura({ x: 80, y: -40 }, 600, 600, 300, 1)).toEqual({ x: 0, y: 0 });
  });
  it("foto deitada anda na horizontal, mas não na vertical", () => {
    const f = folga(1200, 600, 300, 1);
    expect(f.x).toBeGreaterThan(0);
    expect(f.y).toBe(0);
    const d = prenderNaMoldura({ x: 9999, y: 50 }, 1200, 600, 300, 1);
    expect(d.x).toBe(f.x);
    expect(d.y).toBe(0);
  });
  it("com zoom a foto passa a poder andar nos dois sentidos", () => {
    const d = prenderNaMoldura({ x: 999, y: 999 }, 600, 600, 300, 2);
    expect(d.x).toBeGreaterThan(0);
    expect(d.y).toBeGreaterThan(0);
  });
  it("não engasga com valor inválido", () => {
    expect(prenderNaMoldura({ x: Number.NaN, y: 10 }, 600, 600, 300, 2).x).toBe(0);
  });
});

describe("pedaço que vira o arquivo", () => {
  it("sem zoom numa foto quadrada, pega a foto inteira", () => {
    const { sx, sy, s } = pedacoDaFoto(600, 600, 300, 1, { x: 0, y: 0 });
    expect({ sx, sy, s }).toEqual({ sx: 0, sy: 0, s: 600 });
  });
  it("numa foto deitada, pega o quadrado do meio", () => {
    const { sx, sy, s } = pedacoDaFoto(1200, 600, 300, 1, { x: 0, y: 0 });
    expect(s).toBe(600);
    expect(sx).toBe(300);
    expect(sy).toBe(0);
  });
  it("o recorte nunca sai da foto", () => {
    const { sx, sy, s } = pedacoDaFoto(1200, 600, 300, 1, { x: 9999, y: 9999 });
    expect(sx).toBeGreaterThanOrEqual(0);
    expect(sy).toBeGreaterThanOrEqual(0);
    expect(sx + s).toBeLessThanOrEqual(1200);
    expect(sy + s).toBeLessThanOrEqual(600);
  });
  it("com zoom o pedaço é menor", () => {
    expect(pedacoDaFoto(600, 600, 300, 2, { x: 0, y: 0 }).s).toBe(300);
  });
});

describe("recado do envio", () => {
  it("o erro diz que a foto está aqui e o que fazer", () => {
    const t = recadoDoEnvio("erro");
    expect(t).toMatch(/tentar de novo/);
    expect(t).not.toMatch(/erro|falh/i);
  });
});
