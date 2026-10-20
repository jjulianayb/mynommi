import { describe, it, expect } from "vitest";
import {
  chatStickers,
  isStickerId,
  recentStickerIds,
  searchStickers,
  searchCustom,
} from "@/lib/sticker-catalogue";
describe("Nomi sticker catalogue", () => {
  it("contains 24 unique ready-to-render originals", () => {
    expect(chatStickers).toHaveLength(24);
    expect(new Set(chatStickers.map((s) => s.caption)).size).toBe(24);
    expect(chatStickers.every((s) => s.src.length > 0)).toBe(true);
  });
  it("validates sticker IDs", () => {
    expect(isStickerId(23)).toBe(true);
    for (const id of [-1, 24, 1.5, "0", null]) expect(isStickerId(id)).toBe(false);
  });
  it("keeps most recently sent first without duplicates or invalid IDs", () => {
    expect(recentStickerIds([2, 5, 7, 99], 5)).toEqual([5, 2, 7]);
    expect(recentStickerIds([2], 99)).toEqual([2]);
  });
});

describe("buscar figurinhas", () => {
  it("acha pela palavra, sem precisar de acento", () => {
    expect(searchStickers("cafe").some((s) => s.caption.includes("café"))).toBe(true);
    expect(searchStickers("KARAOKÊ").length).toBeGreaterThan(0);
  });
  it("exige todas as palavras do termo", () => {
    expect(searchStickers("café conversa").length).toBe(1);
    expect(searchStickers("café foguete")).toHaveLength(0);
  });
  it("termo vazio mostra tudo", () => {
    expect(searchStickers("   ").length).toBe(chatStickers.length);
  });
  it("busca também nas figurinhas criadas pela pessoa", () => {
    const mine = [{ caption: "bora pra trilha" }, { caption: "saudade" }];
    expect(searchCustom(mine, "trilha")).toHaveLength(1);
    expect(searchCustom(mine, "")).toHaveLength(2);
  });
});
