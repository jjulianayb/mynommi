import { describe, expect, it } from "vitest";
import {
  storyProblem,
  storyKind,
  storyPath,
  timeLeft,
  groupStories,
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
  it("coloca os stories da mesma pessoa em ordem de publicação", () => {
    const list: Story[] = [
      { ...base, id: "2", createdAt: "2026-10-20T12:00:00Z" },
      { ...base, id: "1", createdAt: "2026-10-20T09:00:00Z" },
    ];
    expect(groupStories(list, "z")[0]!.stories.map((s) => s.id)).toEqual(["1", "2"]);
  });
});
