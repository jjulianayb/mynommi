import { describe, expect, it } from "vitest";
import { emOrdem, outroDaConexao, TITULO_VINCULO, VAZIO_VINCULO } from "@/lib/vinculos";

describe("vínculos do Meu Nommi", () => {
  it("acha a outra ponta da conexão, nos dois sentidos", () => {
    const row = { requester_id: "ana", addressee_id: "bia" };
    expect(outroDaConexao(row, "ana")).toBe("bia");
    expect(outroDaConexao(row, "bia")).toBe("ana");
  });
  it("mantém a ordem dos vínculos e descarta quem não deu para identificar", () => {
    const lista = emOrdem(
      ["b", "a", "x"],
      [
        { id: "a", nickname: "Ana", avatar_url: null },
        { id: "b", nickname: "Bia", avatar_url: null },
      ],
    );
    expect(lista.map((p) => p.id)).toEqual(["b", "a"]);
  });
  it("todo tipo de vínculo tem título e texto de vazio", () => {
    for (const t of ["seguidores", "seguindo", "amigos"] as const) {
      expect(TITULO_VINCULO[t].length).toBeGreaterThan(3);
      expect(VAZIO_VINCULO[t].length).toBeGreaterThan(10);
    }
  });
});
