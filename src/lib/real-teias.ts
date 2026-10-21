import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { novo } from "./cloud-novo";
import type { Tribo } from "./tribos";

export type RealTeiaRow = {
  id: number;
  kind: string;
  name: string;
  mode: string;
  category: string | null;
  city: string;
  place: string;
  when_text: string;
  created_by?: string;
  creator_nickname: string;
  created_at: string;
  about?: string;
  rule?: string;
  official?: boolean;
  member_count?: number;
  i_am_member?: boolean;
  cover_path?: string;
  audience?: string;
  who_posts?: string;
  i_can_post?: boolean;
  i_am_creator?: boolean;
};

/** Converte uma tribo salva no servidor para o formato usado pelas telas. */
export function toTeia(r: RealTeiaRow): Tribo {
  return {
    id: r.id,
    name: r.name,
    mode: r.mode,
    members: r.member_count ?? 0,
    icon: r.kind === "role" ? "pin" : "teia",
    tone: r.kind === "role" ? "yellow" : "teal",
    ids: [],
    ...(r.place || r.city ? { place: [r.place, r.city].filter(Boolean).join(" · ") } : {}),
    ...(r.when_text ? { time: r.when_text } : {}),
    ...(r.creator_nickname ? { host: r.creator_nickname } : {}),
    ...(r.about ? { about: r.about } : {}),
    ...(r.rule ? { rule: r.rule } : {}),
    ...(r.official ? { official: true } : {}),
  };
}

/** Coloca primeiro as tribos da cidade da pessoa; o resto segue do mais novo ao mais antigo. */
export function sortByCity<T extends { city: string }>(list: T[], city: string): T[] {
  const c = city.trim().toLowerCase();
  if (!c) return list;
  return [
    ...list.filter((t) => t.city.trim().toLowerCase() === c),
    ...list.filter((t) => t.city.trim().toLowerCase() !== c),
  ];
}

export function useRealTeias(userId: string | null) {
  const [rows, setRows] = useState<RealTeiaRow[]>([]);
  const [joined, setJoined] = useState<number[]>([]);
  const [ready, setReady] = useState(false);
  const load = useCallback(async () => {
    if (!userId) return;
    const [{ data: t }, { data: m }] = await Promise.all([
      supabase.rpc("list_teias", {}),
      supabase.from("teia_members").select("teia_key").eq("user_id", userId),
    ]);
    setRows((t as RealTeiaRow[]) ?? []);
    setJoined((m ?? []).map((x) => Number(x.teia_key)).filter(Number.isFinite));
    setReady(true);
  }, [userId]);
  useEffect(() => {
    void load();
  }, [load]);
  async function join(id: number, nickname: string) {
    if (!userId) return false;
    const { error } = await supabase
      .from("teia_members")
      .upsert({ teia_key: String(id), user_id: userId, nickname: nickname.slice(0, 40) });
    await load();
    return !error;
  }
  async function leave(id: number) {
    if (!userId) return;
    await supabase.from("teia_members").delete().eq("teia_key", String(id)).eq("user_id", userId);
    await load();
  }
  return { ready, rows, joined, reload: load, join, leave };
}

export async function createRealTeia(
  input: {
    kind: "teia" | "role";
    name: string;
    mode?: string;
    category?: string;
    city: string;
    place?: string;
    when?: string;
    about?: string;
    whoPosts?: "todos" | "criadora";
  },
  userId: string,
  nickname: string,
) {
  const { data, error } = await novo
    .from("teias")
    .insert({
      kind: input.kind,
      name: input.name.trim().slice(0, 60),
      mode: input.mode ?? "Presencial",
      category: input.category ?? null,
      city: input.city.trim().slice(0, 80),
      place: (input.place ?? "").trim().slice(0, 80),
      when_text: (input.when ?? "").trim().slice(0, 60),
      created_by: userId,
      creator_nickname: nickname.slice(0, 40),
      about: (input.about ?? "").trim().slice(0, 280),
      who_posts: input.whoPosts ?? "todos",
    })
    .select("id")
    .single();
  if (error || !data) return null;
  await supabase
    .from("teia_members")
    .upsert({ teia_key: String(data.id), user_id: userId, nickname: nickname.slice(0, 40) });
  return data.id as number;
}

export function useRealTeia(id: number, enabled: boolean) {
  const [row, setRow] = useState<RealTeiaRow | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    void supabase.rpc("list_teias", { _id: id }).then(({ data }) => {
      setRow(((data as RealTeiaRow[] | null) ?? [])[0] ?? null);
      setReady(true);
    });
  }, [id, enabled]);
  return { row, ready };
}
