import { describe, expect, it } from "vitest";
import {
  SEM_AMIZADE,
  ordemDasAmizades,
  recadoDaAmizade,
  tituloDasAmizades,
} from "@/lib/amizades-no-descobrir";
import type { Conversa } from "@/lib/direct-messages";

const amiga = (extra: Partial<Conversa> = {}): Conversa => ({
  outroId: "a",
  nickname: "Ana",
  avatar: "",
  ultima: null,
  ultimaSticker: null,
  ultimaMinha: null,
  ultimaEm: null,
  naoLidas: 0,
  tribosJuntas: 0,
  ...extra,
});

describe("a ordem das amizades", () => {
  it("quem está esperando resposta vem primeiro", () => {
    const fila = ordemDasAmizades([
      amiga({ outroId: "velha", ultimaEm: "2026-11-01T10:00:00Z" }),
      amiga({ outroId: "esperando", naoLidas: 2, ultimaEm: "2026-10-01T10:00:00Z" }),
    ]);
    expect(fila[0]?.outroId).toBe("esperando");
  });
  it("quem nunca conversou vem antes de quem já conversou", () => {
    // É a amizade que morre sem nunca ter começado. Conversa que já existe
    // volta sozinha.
    const fila = ordemDasAmizades([
      amiga({ outroId: "ja-falou", ultimaEm: "2026-11-01T10:00:00Z" }),
      amiga({ outroId: "nunca-falou" }),
    ]);
    expect(fila[0]?.outroId).toBe("nunca-falou");
  });
  it("entre conversas, a mais recente primeiro", () => {
    const fila = ordemDasAmizades([
      amiga({ outroId: "antiga", ultimaEm: "2026-10-01T10:00:00Z" }),
      amiga({ outroId: "recente", ultimaEm: "2026-11-01T10:00:00Z" }),
    ]);
    expect(fila.map((c) => c.outroId)).toEqual(["recente", "antiga"]);
  });
  it("não mexe na lista que recebeu", () => {
    const original = [amiga({ outroId: "x", ultimaEm: "2026-10-01T10:00:00Z" }), amiga({ outroId: "y" })];
    ordemDasAmizades(original);
    expect(original.map((c) => c.outroId)).toEqual(["x", "y"]);
  });
});

describe("o recado embaixo do nome", () => {
  it("nunca mostra a última mensagem", () => {
    // A tira é larga de um dedo: o recado sairia cortado, e conversa
    // particular não entra em tela de descoberta.
    const c = amiga({ ultima: "segredo que eu te contei ontem", ultimaEm: "2026-11-01T10:00:00Z" });
    expect(recadoDaAmizade(c)).not.toContain("segredo");
  });
  it("recado novo vence tudo", () => {
    expect(recadoDaAmizade(amiga({ naoLidas: 1, tribosJuntas: 3 }))).toBe("1 recado novo");
    expect(recadoDaAmizade(amiga({ naoLidas: 4 }))).toContain("4 recados");
  });
  it("quem nunca conversou recebe um convite curto", () => {
    expect(recadoDaAmizade(amiga())).toBe("diga oi");
  });
  it("tribos juntas aparecem com o número real", () => {
    const c = amiga({ ultimaEm: "2026-11-01T10:00:00Z", tribosJuntas: 2 });
    expect(recadoDaAmizade(c)).toBe("2 tribos juntas");
  });
  it("o número nunca é inflado nem arredondado", () => {
    for (const n of [1, 2, 7]) {
      expect(recadoDaAmizade(amiga({ ultimaEm: "2026-11-01T10:00:00Z", tribosJuntas: n }))).toContain(
        String(n),
      );
    }
    expect(recadoDaAmizade(amiga({ ultimaEm: "2026-11-01T10:00:00Z", tribosJuntas: 12000 }))).not.toContain(
      "k",
    );
  });
});

describe("o título e o estado sem amizade", () => {
  it("concorda no singular", () => {
    expect(tituloDasAmizades(1)).toContain("amiga aqui");
    expect(tituloDasAmizades(5)).toContain("amigas aqui");
  });
  it("sem amizade, o texto explica o que faz aparecer alguém", () => {
    expect(SEM_AMIZADE).toContain("conversarem");
    expect(/vazio|ninguém ainda|infelizmente/i.test(SEM_AMIZADE)).toBe(false);
  });
});
