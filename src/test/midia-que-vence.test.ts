import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  RECADO_DA_MIDIA,
  RECADO_DO_VIDEO,
  RENOVA_DEPOIS_DE_MS,
  TENTATIVAS,
  VALIDADE_DA_MIDIA,
  precisaRenovar,
} from "@/lib/midia-que-vence";

/**
 * O bug que isto conserta (auditoria de 02/11): o endereço assinado das fotos
 * de post, dos stories e do vídeo do perfil valia **1 hora**, e a nommi é uma
 * página só que fica aberta por dias. Nada recarregava ao voltar ao app, e não
 * existia **nenhum** tratamento de erro de imagem. Quem abria de manhã e
 * voltava à tarde via tudo quebrado.
 *
 * Ninguém conseguia reproduzir porque quem testa acabou de abrir o app.
 */
describe("o prazo da mídia cobre um dia de uso", () => {
  it("é bem maior que a hora que quebrava", () => {
    expect(VALIDADE_DA_MIDIA).toBeGreaterThanOrEqual(4 * 60 * 60);
  });
  it("mas não é eterno: armazenamento fechado existe por um motivo", () => {
    // Endereço que não vence é endereço público com passos extras.
    expect(VALIDADE_DA_MIDIA).toBeLessThanOrEqual(24 * 60 * 60);
  });
  it("renova na metade do prazo, nunca depois de vencer", () => {
    expect(RENOVA_DEPOIS_DE_MS).toBeLessThan(VALIDADE_DA_MIDIA * 1000);
  });
});

describe("quando pedir endereço novo", () => {
  it("sem nada pedido ainda, pede", () => {
    expect(precisaRenovar(null)).toBe(true);
  });
  it("recém-pedido não pede de novo", () => {
    // Trocar de aba não pode disparar uma recarga a cada vez.
    expect(precisaRenovar(Date.now())).toBe(false);
  });
  it("passado o meio do prazo, pede", () => {
    expect(precisaRenovar(Date.now() - RENOVA_DEPOIS_DE_MS - 1000)).toBe(true);
  });
});

describe("a imagem que falha tenta de novo, mas não insiste", () => {
  it("tenta uma vez só", () => {
    // Duas falhas seguidas com endereço novo não é prazo vencido: é arquivo
    // que sumiu ou aparelho sem rede, e insistir gasta dados de quem já está
    // sem rede.
    expect(TENTATIVAS).toBe(1);
  });
  it("o recado diz o que fazer, não só que deu errado", () => {
    for (const r of [RECADO_DA_MIDIA, RECADO_DO_VIDEO]) {
      expect(r).toMatch(/tentar de novo|puxe/i);
      expect(/erro \d|falha técnica|undefined/i.test(r)).toBe(false);
    }
  });
});

describe("as três partes do conserto estão no lugar", () => {
  const posts = readFileSync("src/lib/posts.ts", "utf8");
  const stories = readFileSync("src/lib/stories.ts", "utf8");
  const video = readFileSync("src/lib/video-perfil.ts", "utf8");

  it("nenhum lugar assina com prazo na mão", () => {
    // O prazo mora num lugar só. Número solto na chamada é o bug voltando.
    for (const [nome, texto] of Object.entries({ posts, stories, video })) {
      const onde = [...texto.matchAll(/createSignedUrls?\(/g)].map((m) => m.index!);
      expect(onde.length, nome + ": nenhuma assinatura encontrada").toBeGreaterThan(0);
      for (const i of onde) {
        // O prazo é o último argumento, sempre perto da chamada.
        expect(texto.slice(i, i + 300), nome).toContain("VALIDADE_DA_MIDIA");
      }
    }
  });
  it("feed e stories recarregam ao voltar para o app", () => {
    for (const [nome, texto] of Object.entries({ posts, stories })) {
      expect(texto.includes("aoVoltarParaOApp"), nome).toBe(true);
    }
  });
  it("o feed usa a imagem que sabe falhar", () => {
    const feed = readFileSync("src/components/friends/social-feed.tsx", "utf8");
    expect(feed).toContain("FotoQueFalha");
    expect(feed).toContain("VideoQueFalha");
  });
});
