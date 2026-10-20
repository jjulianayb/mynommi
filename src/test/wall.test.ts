import { describe, expect, it } from "vitest";
import { cleanWallText, toWallItem, MAX_WALL } from "@/lib/wall";

describe('mural "Meus amigos dizem"', () => {
  it("a frase vai até 140 letras", () => {
    expect(cleanWallText(" Chega cedo e leva o melhor café ")).toBe(
      "Chega cedo e leva o melhor café",
    );
    expect(cleanWallText("a".repeat(MAX_WALL))).toHaveLength(140);
    expect(cleanWallText("a".repeat(141))).toBeNull();
    expect(cleanWallText("   ")).toBeNull();
  });
  it("marca o que eu mesma escrevi e usa reserva para o nome", () => {
    const r = {
      id: "1",
      target_id: "b",
      author_id: "a",
      author: "",
      body: "oi",
      sticker: null,
      status: "pendente" as const,
      created_at: "2026-10-20T00:00:00Z",
    };
    expect(toWallItem(r, "a").mine).toBe(true);
    expect(toWallItem(r, "b").mine).toBe(false);
    expect(toWallItem(r, "a").author).toBe("um amigo");
  });
});
