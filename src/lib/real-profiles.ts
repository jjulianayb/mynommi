import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PublicProfile = {
  id: string;
  nickname: string;
  city: string;
  about: string;
  interests: string[];
  avatar_url: string;
};
const COLS = "id,nickname,city,about,interests,avatar_url";

/** Limpa o termo de busca: sem caracteres que quebram o filtro, até 40 letras. */
export function cleanQuery(q: string) {
  return q
    .replace(/[%,()*\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

/** Salva apelido, cidade, bio e (opcional) foto na nuvem. */
export async function saveCloudProfile(
  userId: string,
  data: {
    nickname?: string;
    city?: string;
    about?: string;
    avatar_url?: string;
    avatar_figura?: string;
  },
) {
  // avatar_figura ainda não está em types.ts
  const { error } = await (supabase.from("profiles") as ReturnType<typeof supabase.from>)
    .update(data)
    .eq("id", userId);
  return !error;
}

/** Busca pessoas com perfil público por apelido ou cidade (a regra de acesso esconde perfis privados). */
export function usePeopleSearch(query: string, myId: string | null) {
  const [rows, setRows] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!myId) return;
    const q = cleanQuery(query);
    let alive = true;
    setLoading(true);
    const t = setTimeout(async () => {
      let req = supabase
        .from("profiles")
        .select(COLS)
        .eq("profile_mode", "publico")
        .eq("is_business", false)
        .neq("id", myId)
        .neq("nickname", "")
        .order("updated_at", { ascending: false })
        .limit(30);
      if (q) req = req.or(`nickname.ilike.%${q}%,city.ilike.%${q}%`);
      const { data } = await req;
      if (alive) {
        setRows((data as PublicProfile[] | null) ?? []);
        setLoading(false);
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, myId]);
  return { rows, loading };
}

export function usePublicProfile(id: string, enabled: boolean) {
  const [state, setState] = useState<{
    ready: boolean;
    profile: PublicProfile | null;
    tribos: { id: number; name: string; kind: string; city: string }[];
  }>({ ready: false, profile: null, tribos: [] });
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void (async () => {
      const [{ data: p }, { data: t }] = await Promise.all([
        supabase.from("profiles").select(COLS).eq("id", id).maybeSingle(),
        supabase.rpc("list_teias", { _creator: id }),
      ]);
      if (alive)
        setState({
          ready: true,
          profile: (p as PublicProfile | null) ?? null,
          tribos: (t ?? []).slice(0, 10),
        });
    })();
    return () => {
      alive = false;
    };
  }, [id, enabled]);
  return state;
}
