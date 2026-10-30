import { describe, expect, it } from "vitest";
import {
  BOCA_DENTRO,
  BOCA_FORA,
  CONTORNO,
  CORES_DE_BATOM,
  MANDIBULA,
  MAQUIAGEM_PADRAO,
  OLHO_DIREITO,
  OLHO_ESQUERDO,
  centroDe,
  deslocamentoDoAfinar,
  emPixels,
  empurrao,
  forcaDaCor,
  larguraDoRosto,
  limparMaquiagem,
  temMaquiagem,
  type Ponto,
} from "@/lib/rosto";

/** Um rosto de mentira, com os 468 pontos espalhados num oval. */
function rostoFalso(): Ponto[] {
  const pontos: Ponto[] = [];
  for (let i = 0; i < 468; i++) {
    const a = (i / 468) * Math.PI * 2;
    pontos.push({ x: 0.5 + Math.cos(a) * 0.18, y: 0.5 + Math.sin(a) * 0.26 });
  }
  return pontos;
}

describe("os pontos do rosto", () => {
  it("cada contorno é fechado e sem ponto repetido", () => {
    for (const lista of [BOCA_FORA, BOCA_DENTRO, OLHO_ESQUERDO, OLHO_DIREITO, CONTORNO, MANDIBULA])
      expect(new Set(lista).size).toBe(lista.length);
  });
  it("nenhum índice passa dos 468 do modelo", () => {
    for (const lista of [BOCA_FORA, BOCA_DENTRO, OLHO_ESQUERDO, OLHO_DIREITO, CONTORNO, MANDIBULA])
      for (const i of lista) expect(i).toBeGreaterThanOrEqual(0), expect(i).toBeLessThan(468);
  });
  it("a mandíbula é só a parte de baixo: mexer na testa deforma o rosto", () => {
    expect(MANDIBULA).not.toContain(10);
    expect(MANDIBULA).toContain(152);
  });
  it("de 0 a 1 vira pixel da foto", () => {
    const p = emPixels([{ x: 0.5, y: 0.25 }], [0], 1000, 800);
    expect(p[0]).toEqual({ x: 500, y: 200 });
  });
  it("ponto que o modelo não devolveu é pulado, não vira NaN", () => {
    expect(emPixels([], [0, 1, 2], 100, 100)).toEqual([]);
  });
});

describe("a maquiagem é sempre número e cor do catálogo", () => {
  it("prende cada controle entre 0 e 100", () => {
    const m = limparMaquiagem({ batom: 900, blush: -40, olhos: NaN, afinar: 50.4 });
    expect(m.batom).toBe(100);
    expect(m.blush).toBe(0);
    expect(m.olhos).toBe(0);
    expect(m.afinar).toBe(50);
  });
  it("cor inventada cai na cor padrão", () => {
    expect(limparMaquiagem({ corDoBatom: "red;background:url(x)" }).corDoBatom).toBe(
      MAQUIAGEM_PADRAO.corDoBatom,
    );
    expect(limparMaquiagem({ corDoBatom: CORES_DE_BATOM[1]!.id }).corDoBatom).toBe(
      CORES_DE_BATOM[1]!.id,
    );
  });
  it("tudo em zero é a foto como ela é", () => {
    expect(temMaquiagem(MAQUIAGEM_PADRAO)).toBe(false);
    expect(temMaquiagem({ ...MAQUIAGEM_PADRAO, batom: 10 })).toBe(true);
  });
  it("a cor nunca entra 100%: pele não é tinta", () => {
    expect(forcaDaCor(100, 0.55)).toBeLessThan(1);
    expect(forcaDaCor(0, 0.55)).toBe(0);
  });
});

describe("afinar o rosto", () => {
  const pontos = rostoFalso();
  const larg = larguraDoRosto(pontos, 1000, 1000);
  const mand = emPixels(pontos, MANDIBULA, 1000, 1000);
  const queixo = centroDe(mand);

  it("mede a largura do rosto, para o efeito valer em foto perto e longe", () => {
    expect(larg).toBeGreaterThan(0);
  });
  it("força zero não move nada", () => {
    const d = deslocamentoDoAfinar(mand, queixo, 0, larg);
    for (const p of d) expect(Math.hypot(p.x, p.y)).toBe(0);
  });
  it("nunca passa de uma fração pequena do rosto, mesmo no máximo", () => {
    const d = deslocamentoDoAfinar(mand, queixo, 100, larg);
    for (const p of d) expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(larg * 0.056);
  });
  it("quem está longe do queixo anda mais que quem está junto dele", () => {
    const perto = [{ x: queixo.x + 2, y: queixo.y + 2 }];
    const longe = [{ x: queixo.x + larg * 0.5, y: queixo.y - larg * 0.4 }];
    const dPerto = deslocamentoDoAfinar(perto, queixo, 100, larg)[0]!;
    const dLonge = deslocamentoDoAfinar(longe, queixo, 100, larg)[0]!;
    expect(Math.hypot(dLonge.x, dLonge.y)).toBeGreaterThan(Math.hypot(dPerto.x, dPerto.y));
  });
  it("o empurrão some longe das âncoras: o resto da foto fica intacto", () => {
    const ancoras = [{ x: 500, y: 500 }];
    const deslocam = [{ x: 10, y: 4 }];
    const dentro = empurrao({ x: 505, y: 500 }, ancoras, deslocam, 120);
    const fora = empurrao({ x: 900, y: 900 }, ancoras, deslocam, 120);
    expect(Math.hypot(dentro.x, dentro.y)).toBeGreaterThan(0);
    expect(fora).toEqual({ x: 0, y: 0 });
  });
  it("na própria âncora o empurrão é o deslocamento inteiro", () => {
    const d = empurrao({ x: 500, y: 500 }, [{ x: 500, y: 500 }], [{ x: 8, y: -3 }], 100);
    expect(d.x).toBeCloseTo(8);
    expect(d.y).toBeCloseTo(-3);
  });
});
