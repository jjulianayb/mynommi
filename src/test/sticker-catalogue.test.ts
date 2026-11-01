import { describe, it, expect } from "vitest";
import {
  chatStickers,
  isStickerId,
  isPippoSticker,
  pippoPackLocked,
  PIPPO_FIRST_ID,
  PIPPO_COUNT,
  recentStickerIds,
  searchStickers,
  searchCustom,
} from "@/lib/sticker-catalogue";
describe("Nomi sticker catalogue", () => {
  it("contains 53 ready-to-render stickers: 24 originals + 29 Pippo", () => {
    expect(chatStickers).toHaveLength(53);
    // "Do NEIDA" aparece em duas poses do Pippo, então há 52 legendas únicas.
    expect(new Set(chatStickers.map((s) => s.caption)).size).toBe(52);
    expect(chatStickers.every((s) => s.src.length > 0)).toBe(true);
  });
  it("keeps the 24 original stickers in place and appends the Pippo pack", () => {
    expect(PIPPO_FIRST_ID).toBe(24);
    expect(PIPPO_COUNT).toBe(29);
    expect(chatStickers[23]?.pack).toBe("tribo");
    expect(chatStickers[24]?.pack).toBe("pippo");
    expect(isPippoSticker(23)).toBe(false);
    expect(isPippoSticker(24)).toBe(true);
    expect(isPippoSticker(52)).toBe(true);
    expect(isPippoSticker(53)).toBe(false);
    expect(pippoPackLocked).toBe(true);
  });
  it("validates sticker IDs", () => {
    expect(isStickerId(23)).toBe(true);
    expect(isStickerId(52)).toBe(true);
    for (const id of [-1, 53, 1.5, "0", null]) expect(isStickerId(id)).toBe(false);
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
  it("acha as figurinhas do Pippo", () => {
    expect(searchStickers("neida")).toHaveLength(2);
    expect(searchStickers("sextou").some((s) => s.caption === "Sextou!")).toBe(true);
    expect(searchStickers("pão de queijo")).toHaveLength(1);
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
