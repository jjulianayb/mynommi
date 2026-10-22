import { describe, expect, it } from "vitest";
import { destinoDoAviso, diaDoAviso, iconeDoAviso, toAviso, type Aviso } from "@/lib/avisos";

const base: Aviso = {
  id: "1",
  kind: "comentario",
  actorId: "b",
  teiaId: null,
  postId: "p",
  body: "oi",
  lido: false,
  quando: "2026-10-22T10:00:00Z",
};

describe("avisos", () => {
  it("leva para o lugar certo", () => {
    expect(destinoDoAviso({ ...base, kind: "amizade_pedida" })).toEqual({
      to: "/nommi/$id",
      params: { id: "b" },
    });
    expect(destinoDoAviso({ ...base, kind: "amizade_pedida", actorId: null })).toEqual({
      to: "/amigos",
    });
    expect(destinoDoAviso({ ...base, kind: "mural" })).toEqual({ to: "/perfil" });
    expect(destinoDoAviso({ ...base, kind: "quero_ir", teiaId: 100001 })).toEqual({
      to: "/grupos/$id",
      params: { id: "100001" },
    });
    expect(destinoDoAviso(base)).toEqual({ to: "/" });
  });
  it("separa por dia", () => {
    const agora = new Date("2026-10-22T15:00:00Z");
    expect(diaDoAviso("2026-10-22T09:00:00Z", agora)).toBe("Hoje");
    expect(diaDoAviso("2026-10-21T09:00:00Z", agora)).toBe("Ontem");
    expect(diaDoAviso("2026-10-02T09:00:00Z", agora)).toMatch(/outubro/);
  });
  it("tem ícone para cada tipo", () => {
    expect(iconeDoAviso("amizade_aceita")).toBe("check");
    expect(iconeDoAviso("reacao")).toBe("heart");
  });
  it("marca como lido pelo read_at", () => {
    const r = {
      id: "1",
      kind: "reacao" as const,
      actor_id: null,
      teia_id: null,
      post_id: null,
      body: "x",
      read_at: null,
      created_at: "2026-10-22T10:00:00Z",
    };
    expect(toAviso(r).lido).toBe(false);
    expect(toAviso({ ...r, read_at: "2026-10-22T11:00:00Z" }).lido).toBe(true);
  });
});
