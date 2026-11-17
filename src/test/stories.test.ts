import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  storyProblem,
  storyKind,
  storyPath,
  timeLeft,
  groupStories,
  soComLink,
  tipoDoStory,
  type Story,
} from "@/lib/stories";

const base: Story = {
  id: "1",
  authorId: "a",
  authorName: "Ana",
  authorAvatar: "",
  kind: "foto",
  path: "a/1.jpg",
  caption: "",
  audience: "todos",
  createdAt: "2026-10-20T10:00:00Z",
  expiresAt: "2026-10-21T10:00:00Z",
  seen: false,
  mine: false,
};

describe("stories", () => {
  it("aceita foto e vídeo dentro do tamanho", () => {
    expect(storyProblem({ type: "image/jpeg", size: 1000 })).toBeNull();
    expect(storyProblem({ type: "video/mp4", size: 1000 })).toBeNull();
    expect(storyProblem({ type: "image/png", size: 6e6 })).toMatch(/5 MB/);
    expect(storyProblem({ type: "video/mp4", size: 60e6 })).toMatch(/50 MB/);
    expect(storyProblem({ type: "application/pdf", size: 10 })).toMatch(/foto ou um vídeo/);
    // foto de iPhone chega em HEIC: não pode mais ser recusada
    expect(storyProblem({ type: "image/heic", size: 1000 })).toBeNull();
    expect(storyProblem({ type: "image/heif", size: 1000 })).toBeNull();
    expect(storyProblem({ type: "image/avif", size: 1000 })).toBeNull();
  });
  it("separa foto de vídeo e põe o caminho dentro da pasta da pessoa", () => {
    expect(storyKind("video/mp4")).toBe("video");
    expect(storyKind("image/webp")).toBe("foto");
    expect(storyPath("u1", "image/png", 1000).startsWith("u1/1000-")).toBe(true);
    expect(storyPath("u1", "video/mp4", 1000).endsWith(".mp4")).toBe(true);
  });
  it("diz quanto falta para sumir", () => {
    const now = Date.parse("2026-10-20T12:00:00Z");
    expect(timeLeft("2026-10-20T12:30:00Z", now)).toBe("some em 30 min");
    expect(timeLeft("2026-10-20T13:00:00Z", now)).toBe("some em 1 h");
    expect(timeLeft("2026-10-20T11:00:00Z", now)).toBe("acabou");
  });
  it("agrupa por pessoa: eu primeiro, depois quem tem novidade", () => {
    const list: Story[] = [
      { ...base, id: "1", authorId: "b", authorName: "Bia", seen: true },
      { ...base, id: "2", authorId: "c", authorName: "Cris", seen: false },
      { ...base, id: "3", authorId: "a", authorName: "Ana", mine: true, seen: true },
    ];
    const g = groupStories(list, "a");
    expect(g.map((x) => x.authorId)).toEqual(["a", "c", "b"]);
    expect(g[0]!.mine).toBe(true);
    expect(g[1]!.allSeen).toBe(false);
    expect(g[2]!.allSeen).toBe(true);
  });
  it("story cujo arquivo não existe mais sai da lista", () => {
    const list: Story[] = [
      { ...base, id: "1", url: "https://x/1.jpg" },
      { ...base, id: "2" },
    ];
    expect(list.filter(soComLink).map((s) => s.id)).toEqual(["1"]);
  });
  it("coloca os stories da mesma pessoa em ordem de publicação", () => {
    const list: Story[] = [
      { ...base, id: "2", createdAt: "2026-10-20T12:00:00Z" },
      { ...base, id: "1", createdAt: "2026-10-20T09:00:00Z" },
    ];
    expect(groupStories(list, "z")[0]!.stories.map((s) => s.id)).toEqual(["1", "2"]);
  });
});

/**
 * A extensão errada do vídeo (achado do Instinct, 17/11).
 *
 * `storyPath()` mandava **todo** vídeo que não fosse mp4 para `.webm` — e
 * `storyProblem()` aceita `video/quicktime` (o `.mov` do iPhone), `x-m4v` e
 * `3gpp`. O arquivo subia com extensão que não corresponde ao conteúdo.
 *
 * A correção vai além do mapa de extensões: o `.mov`, o `.m4v` e o `.3gp` são
 * o **mesmo recipiente** do `.mp4` (ISO BMFF), e o Chrome do Android recusa de
 * cara qualquer coisa anunciada como `video/quicktime` mas toca o conteúdo
 * como `video/mp4`. É a mesma decisão já tomada para a foto do post em 02/11.
 * Por isso a extensão e o tipo anunciado andam juntos: `tipoDoStory()` decide
 * os dois.
 */
describe("a extensão do vídeo bate com o conteúdo", () => {
  const ext = (t: string) => storyPath("u1", t).split(".").pop();

  it("nenhum vídeo de iPhone vira .webm", () => {
    // Era o bug, exatamente.
    for (const t of ["video/quicktime", "video/x-m4v", "video/3gpp"])
      expect(ext(t), t).not.toBe("webm");
  });
  it("o que é o mesmo recipiente do mp4 sobe como mp4", () => {
    for (const t of ["video/mp4", "video/quicktime", "video/x-m4v", "video/3gpp"])
      expect(ext(t), t).toBe("mp4");
  });
  it("WebM continua WebM, que é o que a câmera do Android grava", () => {
    expect(ext("video/webm")).toBe("webm");
  });
  it("a extensão nunca contradiz o tipo anunciado", () => {
    // É esta a regra que estava quebrada; as de cima são casos dela.
    const casados: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm" };
    for (const t of ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v", "video/3gpp"]) {
      const anunciado = tipoDoStory(t);
      expect(ext(t), t + " anunciado como " + anunciado).toBe(casados[anunciado]);
    }
  });
  it("todo vídeo que storyProblem aceita tem extensão decidida", () => {
    // Formato novo que passe pela conferência não pode cair num padrão errado.
    for (const t of ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v", "video/3gpp", "video/ogg"]) {
      expect(storyProblem({ type: t, size: 1000 }), t).toBeNull();
      expect(["mp4", "webm"], t).toContain(ext(t));
    }
  });
  it("foto não é renomeada: quem converte é o canvas, antes daqui", () => {
    expect(tipoDoStory("image/png")).toBe("image/png");
    expect(ext("image/png")).toBe("png");
    expect(ext("image/webp")).toBe("webp");
    expect(ext("image/jpeg")).toBe("jpg");
  });
});

/**
 * O arquivo que sumia do balde com a linha de pé (caso da Ana, 01/11).
 *
 * `remove()` apagava o **arquivo** primeiro e a linha depois. Se a segunda
 * parte falhasse — permissão, rede, aba fechada no meio — o arquivo já tinha
 * ido e a linha ficava. E `soComLink` esconde em silêncio todo story cujo
 * arquivo não gera endereço: linha no banco, arquivo sumido, story invisível
 * sem erro nenhum. É a assinatura exata do que a Ju relatou.
 */
describe("apagar story: a linha sai antes do arquivo", () => {
  const fonte = readFileSync("src/lib/stories.ts", "utf8");
  const corpo = fonte.slice(fonte.indexOf("const remove ="));
  const ate = corpo.slice(0, corpo.indexOf("return true"));

  it("a linha é apagada antes do arquivo", () => {
    const linha = ate.indexOf('from("stories").delete()');
    const arquivo = ate.indexOf(".remove([story.path])");
    expect(linha).toBeGreaterThan(0);
    expect(arquivo).toBeGreaterThan(0);
    expect(linha, "o arquivo está sendo apagado antes da linha").toBeLessThan(arquivo);
  });
  it("falhar na linha não chega a tocar no arquivo", () => {
    expect(ate).toMatch(/if \(error\) return false;/);
  });
});
