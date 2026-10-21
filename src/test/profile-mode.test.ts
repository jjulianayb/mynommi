import { describe, expect, it } from "vitest";
import { visibleInListings, initialState } from "@/lib/friends-data";
import { visibilityFor } from "@/components/friends/privacy";

describe("Perfil público ou privado", () => {
  it("perfil privado não aparece para quem não tem match", () => {
    expect(visibleInListings({ id: 13, private: true }, [7])).toBe(false);
  });
  it("perfil privado aparece para quem já tem match", () => {
    expect(visibleInListings({ id: 13, private: true }, [13])).toBe(true);
  });
  it("o padrão é perfil público", () => {
    expect(initialState.profileMode).toBe("publico");
  });
  it("perfil privado passa fotos, rolês e tribo para amizades", () => {
    expect(visibilityFor("privado")).toEqual({
      fotos: "amizades",
      roles: "amizades",
      teia: "amizades",
    });
  });
});
