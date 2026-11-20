import { describe, expect, it } from "vitest";
import { caminhoFigurinha, dataUrlParaBlob } from "@/lib/figurinha-envio";

describe("figurinha criada viajando de verdade", () => {
  it("guarda a figurinha na pasta de quem enviou, com o lugar no nome", () => {
    expect(caminhoFigurinha("u1", "conversa", 1000)).toBe("u1/conversa-1000.webp");
    expect(caminhoFigurinha("u1", "tribo", 1000)).toBe("u1/tribo-1000.webp");
  });
  it("converte o data-url do canvas em arquivo", () => {
    const blob = dataUrlParaBlob("data:image/webp;base64," + btoa("desenho"));
    expect(blob).not.toBeNull();
    expect(blob!.type).toBe("image/webp");
    expect(blob!.size).toBe(7);
  });
  it("recusa texto quebrado em vez de subir lixo", () => {
    expect(dataUrlParaBlob("sem-prefixo")).toBeNull();
    expect(dataUrlParaBlob("data:image/webp;base64,%%%")).toBeNull();
  });
});
