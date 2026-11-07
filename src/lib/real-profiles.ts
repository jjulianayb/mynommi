import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PublicProfile = {
  id: string;
  nickname: string;
  city: string;
  about: string;
  interests: string[];
  avatar_url: string;
  video_path?: string;
  avatar_figura?: string;
  /** 0064: UF e procurando são lidos direto; estado civil e idade só chegam
   *  pela perfil_de_amigo, e só com a chave da dona ligada. */
  estado?: string;
  procurando?: string[];
  estado_civil?: string;
  idade?: number | null;
};
const COLS = "id,nickname,city,about,interests,avatar_url,video_path,avatar_figura,estado,procurando";

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
    estado?: string;
    procurando?: string[];
    estado_civil?: string;
    mostrar_estado_civil?: boolean;
    mostrar_cidade?: boolean;
    mostrar_idade?: boolean;
    mostrar_online?: boolean;
  },
) {
  // avatar_figura ainda não está em types.ts
  const { error } = await (supabase.from("profiles") as ReturnType<typeof supabase.from>).update(data).eq("id", userId);
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
      // estado e procurando ainda não estão em types.ts: mesma conversão do combinar.
      const db = supabase as unknown as SupabaseClient;
      let [{ data: p }, { data: t }] = await Promise.all([
        db.from("profiles").select(COLS).eq("id", id).maybeSingle(),
        supabase.rpc("list_teias", { _creator: id }),
      ]);
      // Perfil privado de uma amizade aceita: a tabela esconde a linha (RLS),
      // mas a amiga pode ver o básico — a RPC perfil_de_amigo devolve só as
      // colunas seguras nesse caso (0061). Ela também é a única fonte de
      // idade e estado civil (0064): saem só com a chave da dona ligada, e
      // a data de nascimento nunca trafega.
      const { data: pa } = await (supabase as unknown as SupabaseClient).rpc("perfil_de_amigo", { _id: id });
      const amigo = (((pa as PublicProfile[] | null) ?? [])[0] ?? null) as PublicProfile | null;
      if (!p) {
        p = amigo as typeof p;
      } else if (amigo) {
        p = {
          ...(p as PublicProfile),
          estado_civil: amigo.estado_civil,
          idade: amigo.idade,
        } as unknown as typeof p;
      }
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
