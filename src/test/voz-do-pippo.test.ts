import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PIPPO_NAO_FALA_DE, foraDaVozDoPippo } from "@/lib/voz-do-pippo";

/**
 * O Pippo recebe, explica e faz graça; ele não dá notícia ruim.
 *
 * Mascote dando má notícia é o jeito mais rápido de a pessoa achar que o app
 * está tirando sarro dela. Quem perdeu a senha ou foi ofendida numa tribo não
 * quer um personagem engraçado na frente — quer resposta.
 */
describe("a régua de voz do Pippo", () => {
  it("acha o que está fora da régua", () => {
    expect(foraDaVozDoPippo("Deu erro ao salvar sua senha")).toEqual(
      expect.arrayContaining(["erro", "senha"]),
    );
  });
  it("texto de guia passa limpo", () => {
    expect(foraDaVozDoPippo("Entre numa tribo pelo que você gosta e converse por lá.")).toEqual([]);
  });

  it("o que o Pippo diz na tela respeita a régua", () => {
    const tela = readFileSync("src/components/friends/pippo.tsx", "utf8");
    // Só o texto entre aspas, que é o que a pessoa lê.
    const falas = [...tela.matchAll(/"([^"]{12,})"/g)]
      .map((m) => m[1] as string)
      .filter((t) => /\s/.test(t) && !t.includes("/") && !t.includes("@"));
    for (const fala of falas) {
      expect(foraDaVozDoPippo(fala), fala).toEqual([]);
    }
  });

  it("a lista não está vazia, senão o teste não protege nada", () => {
    expect(PIPPO_NAO_FALA_DE.length).toBeGreaterThan(4);
  });
});
