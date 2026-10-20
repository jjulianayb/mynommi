import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WallItem = {
  id: string;
  targetId: string;
  authorId: string;
  author: string;
  body: string | null;
  sticker: number | null;
  status: "pendente" | "aprovado";
  createdAt: string;
  mine: boolean;
};
export const MAX_WALL = 140;

export function cleanWallText(t: string): string | null {
  const s = t.trim();
  return s.length >= 1 && s.length <= MAX_WALL ? s : null;
}

type Row = {
  id: string;
  target_id: string;
  author_id: string;
  author: string;
  body: string | null;
  sticker: number | null;
  status: "pendente" | "aprovado";
  created_at: string;
};
export const toWallItem = (r: Row, me: string): WallItem => ({
  id: r.id,
  targetId: r.target_id,
  authorId: r.author_id,
  author: r.author || "um amigo",
  body: r.body,
  sticker: r.sticker,
  status: r.status,
  createdAt: r.created_at,
  mine: r.author_id === me,
});

/** "Meus amigos dizem": frases e figurinhas de amigos. Quem vê o mural de outra pessoa só recebe as aprovadas. */
export function useWall(me: string | null, ownerId: string | null) {
  const [items, setItems] = useState<WallItem[]>([]);
  const load = useCallback(async () => {
    if (!me || !ownerId) return;
    const { data } = await cloud
      .from("wall_items")
      .select("id,target_id,author_id,author,body,sticker,status,created_at")
      .eq("target_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(100);
    setItems(((data as Row[] | null) ?? []).map((r) => toWallItem(r, me)));
  }, [me, ownerId]);
  useEffect(() => {
    void load();
  }, [load]);
  const isOwner = !!me && me === ownerId;
  const approved = items.filter((i) => i.status === "aprovado");
  const pending = isOwner ? items.filter((i) => i.status === "pendente") : [];
  const mineWaiting = items.filter((i) => i.status === "pendente" && i.mine);
  const write = async (input: { text?: string; sticker?: number }, nickname: string) => {
    if (!me || !ownerId || isOwner) return false;
    const body = input.text ? cleanWallText(input.text) : null;
    if (input.text && !body) return false;
    if (!body && input.sticker == null) return false;
    const { error } = await supabase.from("wall_items").insert({
      target_id: ownerId,
      author_id: me,
      author: nickname.slice(0, 40),
      body,
      sticker: input.sticker ?? null,
    });
    await load();
    return !error;
  };
  const approve = async (id: string) => {
    const { error } = await supabase.from("wall_items").update({ status: "aprovado" }).eq("id", id);
    await load();
    return !error;
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("wall_items").delete().eq("id", id);
    await load();
    return !error;
  };
  return { approved, pending, mineWaiting, write, approve, remove, reload: load };
}
