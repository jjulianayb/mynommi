import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useState } from "react";

export type Secret = {
  id: string;
  authorId: string | null;
  authorName: string;
  authorAvatar: string;
  body: string;
  createdAt: string;
  expiresAt: string;
  mine: boolean;
  anonymous: boolean;
};

export const MAX_SECRET = 500;
export const DIAS_PADRAO = 7;

/** Texto do "Só entre nós": de 1 a 500 letras. */
export function cleanSecret(text: string): string | null {
  const t = text.trim();
  return t.length >= 1 && t.length <= MAX_SECRET ? t : null;
}

/** Quanto falta para sumir. */
export function timeLeft(expiresAt: string, now = Date.now()): string {
  const h = Math.floor((new Date(expiresAt).getTime() - now) / 3600000);
  if (h <= 0) return "sumindo agora";
  if (h < 24) return `some em ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "some amanhã" : `some em ${d} dias`;
}

/** Prazos que a pessoa pode escolher. */
export const PRAZOS = [
  { dias: 1, label: "1 dia" },
  { dias: 7, label: "7 dias" },
  { dias: 30, label: "30 dias" },
] as const;

export const expiresIn = (dias: number, now = Date.now()) =>
  new Date(now + dias * 86400000).toISOString();

type Row = { id: string; author_id: string; body: string; created_at: string; expires_at: string };

export function useSecrets(me: string | null, triboId: number | null) {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    if (!me || triboId == null) return;
    const { data } = await supabase.rpc("segredos_da_tribo", { _teia: triboId });
    type Linha = {
      id: string;
      body: string;
      created_at: string;
      expires_at: string;
      anonymous: boolean;
      author_id: string | null;
      nickname: string;
      avatar_url: string;
      mine: boolean;
    };
    setSecrets(
      ((data as Linha[] | null) ?? []).map((r) => ({
        id: r.id,
        authorId: r.author_id,
        authorName: r.nickname || "nommi",
        authorAvatar: r.avatar_url || "",
        body: r.body,
        createdAt: r.created_at,
        expiresAt: r.expires_at,
        mine: r.mine,
        anonymous: r.anonymous,
      })),
    );
    setReady(true);
  }, [me, triboId]);

  useEffect(() => {
    if (!me || triboId == null) return;
    void load();
    const ch = supabase
      .channel(`secrets-${triboId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts", filter: "teia_id=eq." + triboId },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [me, triboId, load]);

  const publish = async (text: string, dias = DIAS_PADRAO, anonimo = false) => {
    const body = cleanSecret(text);
    if (!me || triboId == null || !body)
      return { ok: false as const, error: "Escreva de 1 a 500 letras." };
    const { error } = await supabase.from("posts").insert({
      author_id: me,
      teia_id: triboId,
      body,
      secret: true,
      anonymous: anonimo,
      expires_at: expiresIn(dias),
    });
    if (error)
      return {
        ok: false as const,
        error: "Não foi possível publicar. Você está nesta tribo e pode falar nela?",
      };
    await load();
    return { ok: true as const };
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("posts").delete().eq("id", id);
    await load();
    return !error;
  };

  return { secrets, ready, publish, remove, reload: load };
}
