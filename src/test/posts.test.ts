import { describe, expect, it } from "vitest";
import {
  cleanBody,
  mediaProblem,
  mediaKind,
  mediaPath,
  timeAgo,
  toPost,
  totalReactions,
  MAX_MEDIA,
} from "@/lib/posts";

const authors = { a: { nickname: "Ana", avatar_url: "foto.png" } };
const row = {
  id: "p1",
  author_id: "a",
  teia_id: 7,
  body: "Trilha boa",
  location: "Serra do Curral",
  created_at: "2026-10-20T00:00:00Z",
};

describe("texto do post", () => {
  it("aceita de 1 a 1000 letras e tira os espaços das pontas", () => {
    expect(cleanBody("  oi  ")).toBe("oi");
    expect(cleanBody("")).toBeNull();
    expect(cleanBody("   ")).toBeNull();
    expect(cleanBody("a".repeat(1000))).toHaveLength(1000);
    expect(cleanBody("a".repeat(1001))).toBeNull();
  });
  it("comentário tem limite próprio de 500", () => {
    expect(cleanBody("a".repeat(500), 500)).toHaveLength(500);
    expect(cleanBody("a".repeat(501), 500)).toBeNull();
  });
});

describe("fotos e vídeos", () => {
  it("aceita JPG, PNG, WebP, MP4 e WebM", () => {
    expect(mediaProblem({ type: "image/jpeg", size: 1000 }, 0)).toBeNull();
    expect(mediaProblem({ type: "video/mp4", size: 1000 }, 0)).toBeNull();
    expect(mediaProblem({ type: "image/gif", size: 10 }, 0)).toMatch(/JPG/);
  });
  it("recusa foto acima de 5 MB e vídeo acima de 30 MB", () => {
    expect(mediaProblem({ type: "image/png", size: 6e6 }, 0)).toMatch(/5 MB/);
    expect(mediaProblem({ type: "video/mp4", size: 33e6 }, 0)).toMatch(/30 MB/);
  });
  it("não passa de quatro arquivos", () => {
    expect(mediaProblem({ type: "image/jpeg", size: 10 }, MAX_MEDIA)).toMatch(/4 fotos/);
  });
  it("separa foto de vídeo e monta o caminho a partir do id de quem envia", () => {
    expect(mediaKind("video/webm")).toBe("video");
    expect(mediaKind("image/png")).toBe("foto");
    expect(mediaPath("u1", "p1", 0, "image/png")).toBe("u1/p1/0.png");
    expect(mediaPath("u1", "p1", 2, "video/mp4")).toBe("u1/p1/2.mp4");
  });
});

describe("montagem do post", () => {
  it("conta reações, marca a minha e ordena as mídias", () => {
    const p = toPost(
      {
        ...row,
        post_reactions: [
          { user_id: "a", kind: "curtir" },
          { user_id: "b", kind: "curtir" },
          { user_id: "c", kind: "rir" },
        ],
        post_media: [
          { id: "m2", kind: "foto", path: "x/1.jpg", position: 1 },
          { id: "m1", kind: "foto", path: "x/0.jpg", position: 0 },
        ],
        post_comments: [{ count: 3 }],
      },
      "b",
      authors,
    );
    expect(p.reactions.curtir).toBe(2);
    expect(p.reactions.rir).toBe(1);
    expect(p.myReaction).toBe("curtir");
    expect(totalReactions(p)).toBe(3);
    expect(p.media.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(p.commentCount).toBe(3);
    expect(p.mine).toBe(false);
  });
  it("usa o nome e a foto de quem escreveu, com reserva quando falta", () => {
    expect(toPost(row, "a", authors).authorName).toBe("Ana");
    expect(toPost(row, "a", {}).authorName).toBe("nommi");
  });
  it("reconhece o post como meu", () => {
    expect(toPost(row, "a", authors).mine).toBe(true);
  });
});

describe("tempo", () => {
  const now = new Date("2026-10-20T12:00:00Z").getTime();
  it("mostra agora, minutos, horas, ontem e dias", () => {
    expect(timeAgo("2026-10-20T11:59:30Z", now)).toBe("agora");
    expect(timeAgo("2026-10-20T11:30:00Z", now)).toBe("há 30 min");
    expect(timeAgo("2026-10-20T09:00:00Z", now)).toBe("há 3 h");
    expect(timeAgo("2026-10-19T09:00:00Z", now)).toBe("ontem");
    expect(timeAgo("2026-10-17T09:00:00Z", now)).toBe("há 3 dias");
    expect(timeAgo("2026-09-10T09:00:00Z", now)).toMatch(/set/);
  });
});
