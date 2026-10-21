import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ProfileStats = {
  followers: number;
  following: number;
  connections: number;
  tribos: number;
  posts: number;
  visible: boolean;
};

/** 512 → "512"; 1 234 → "1,2 mil"; 2 500 000 → "2,5 mi". */
export function formatCount(n: number): string {
  const f = (v: number) => (Math.round(v * 10) / 10).toString().replace(".", ",");
  if (n >= 1_000_000) return `${f(n / 1_000_000)} mi`;
  if (n >= 10_000) return `${Math.floor(n / 1000)} mil`;
  if (n >= 1000) return `${f(n / 1000)} mil`;
  return String(n);
}

type StatsRow = {
  followers: number | null;
  following: number | null;
  connections: number | null;
  tribos: number | null;
  posts: number | null;
  visible: boolean;
};
/** Resultado do servidor → números. Se a pessoa escondeu as contagens, devolve visible=false e zeros. */
export function toStats(r: StatsRow | null | undefined): ProfileStats {
  if (!r)
    return { followers: 0, following: 0, connections: 0, tribos: 0, posts: 0, visible: false };
  return {
    followers: r.followers ?? 0,
    following: r.following ?? 0,
    connections: r.connections ?? 0,
    tribos: r.tribos ?? 0,
    posts: r.posts ?? 0,
    visible: !!r.visible,
  };
}

export function useProfileStats(userId: string | null) {
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.rpc("profile_stats", { _user: userId });
    setStats(toStats(((data as StatsRow[] | null) ?? [])[0]));
  }, [userId]);
  useEffect(() => {
    void load();
  }, [load]);
  return { stats, reload: load };
}

/** Seguir e deixar de seguir uma pessoa de perfil público. */
export function useFollow(me: string | null, target: string | null) {
  const [following, setFollowing] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!me || !target || me === target) return;
    void supabase
      .from("follows")
      .select("followed_id")
      .eq("follower_id", me)
      .eq("followed_id", target)
      .maybeSingle()
      .then(({ data }) => {
        setFollowing(!!data);
        setReady(true);
      });
  }, [me, target]);
  const toggle = async () => {
    if (!me || !target || me === target) return false;
    const { error } = following
      ? await supabase.from("follows").delete().eq("follower_id", me).eq("followed_id", target)
      : await supabase.from("follows").insert({ follower_id: me, followed_id: target });
    if (!error) setFollowing(!following);
    return !error;
  };
  return { following, ready, toggle };
}

/** Escolha de quem não quer mostrar os próprios números. */
export async function setShowCounts(me: string, show: boolean) {
  const { error } = await supabase.from("profiles").update({ show_counts: show }).eq("id", me);
  return !error;
}
