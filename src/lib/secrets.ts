import { useCallback, useEffect, useState } from "react";
import { novo } from "./cloud-novo";

export type Secret = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  body: string;
  createdAt: string;
  expiresAt: string;
  mine: boolean;
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
    const { data } = await novo
      .from("posts")
      .select("id,author_id,body,created_at,expires_at")
      .eq("teia_id", triboId)
      .eq("secret", true)
      .eq("status", "publicado")
      .order("created_at", { ascending: false })
      .limit(100);
    const rows = (data as Row[] | null) ?? [];
    const ids = [...new Set(rows.map((r) => r.author_id))];
    const quem = new Map<string, { nickname: string; avatar_url: string }>();
    if (ids.length) {
      const { data: ps } = await novo
        .from("profiles")
        .select("id,nickname,avatar_url")
        .in("id", ids);
      for (const p of (ps as { id: string; nickname: string; avatar_url: string }[] | null) ?? [])
        quem.set(p.id, p);
    }
    setSecrets(
      rows.map((r) => {
        const p = quem.get(r.author_id);
        return {
          id: r.id,
          authorId: r.author_id,
          authorName: p?.nickname || "nommi",
          authorAvatar: p?.avatar_url ?? "",
          body: r.body,
          createdAt: r.created_at,
          expiresAt: r.expires_at,
          mine: r.author_id === me,
        };
      }),
    );
    setReady(true);
  }, [me, triboId]);

  useEffect(() => {
    if (!me || triboId == null) return;
    void load();
    const ch = novo
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
      void novo.removeChannel(ch);
    };
  }, [me, triboId, load]);

  const publish = async (text: string, dias = DIAS_PADRAO) => {
    const body = cleanSecret(text);
    if (!me || triboId == null || !body)
      return { ok: false as const, error: "Escreva de 1 a 500 letras." };
    const { error } = await novo
      .from("posts")
      .insert({ author_id: me, teia_id: triboId, body, secret: true, expires_at: expiresIn(dias) });
    if (error)
      return { ok: false as const, error: "Não foi possível publicar. Você está nesta tribo?" };
    await load();
    return { ok: true as const };
  };

  const remove = async (id: string) => {
    const { error } = await novo.from("posts").delete().eq("id", id);
    await load();
    return !error;
  };

  return { secrets, ready, publish, remove, reload: load };
}
