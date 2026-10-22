import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** A tabela notifications ainda não está em types.ts; quando o Lovable regerar, usar supabase direto. */
const db = supabase as unknown as SupabaseClient;

export type AvisoKind =
  | "amizade_pedida"
  | "amizade_aceita"
  | "comentario"
  | "reacao"
  | "mural"
  | "entrou_na_tribo"
  | "quero_ir"
  | "recado_tribo"
  | "match";
export type Aviso = {
  id: string;
  kind: AvisoKind;
  actorId: string | null;
  teiaId: number | null;
  postId: string | null;
  body: string;
  lido: boolean;
  quando: string;
};

const ICONES: Record<AvisoKind, string> = {
  amizade_pedida: "plus",
  amizade_aceita: "check",
  comentario: "chat",
  reacao: "heart",
  mural: "stickers",
  entrou_na_tribo: "teia",
  quero_ir: "pin",
  recado_tribo: "teia",
  match: "heart",
};
export const iconeDoAviso = (k: AvisoKind) => ICONES[k] ?? "spark";

/** Para onde o aviso leva quando a pessoa toca nele. */
export function destinoDoAviso(a: Aviso): { to: string; params?: Record<string, string> } {
  if (a.kind === "match")
    return a.actorId ? { to: "/conversas/$id", params: { id: a.actorId } } : { to: "/amigos" };
  if (a.kind === "amizade_pedida" || a.kind === "amizade_aceita") {
    return a.actorId ? { to: "/nommi/$id", params: { id: a.actorId } } : { to: "/amigos" };
  }
  if (a.kind === "mural") return { to: "/perfil" };
  if (a.teiaId != null) return { to: "/grupos/$id", params: { id: String(a.teiaId) } };
  return { to: "/" };
}

/** Agrupa por dia para a tela não virar uma lista infinita. */
export function diaDoAviso(iso: string, agora = new Date()): string {
  const d = new Date(iso);
  const dia = (x: Date) => x.toISOString().slice(0, 10);
  const ontem = new Date(agora.getTime() - 86400000);
  if (dia(d) === dia(agora)) return "Hoje";
  if (dia(d) === dia(ontem)) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

type Linha = {
  id: string;
  kind: AvisoKind;
  actor_id: string | null;
  teia_id: number | null;
  post_id: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
};
export const toAviso = (r: Linha): Aviso => ({
  id: r.id,
  kind: r.kind,
  actorId: r.actor_id,
  teiaId: r.teia_id,
  postId: r.post_id,
  body: r.body,
  lido: !!r.read_at,
  quando: r.created_at,
});

export function useAvisos(me: string | null) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    if (!me) return;
    const { data } = await db
      .from("notifications")
      .select("id,kind,actor_id,teia_id,post_id,body,read_at,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setAvisos(((data as Linha[] | null) ?? []).map(toAviso));
    setReady(true);
  }, [me]);

  useEffect(() => {
    if (!me) return;
    void load();
    const ch = db
      .channel("avisos-" + me)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        void load();
      })
      .subscribe();
    return () => {
      void db.removeChannel(ch);
    };
  }, [me, load]);

  const marcarTodos = async () => {
    if (!me) return;
    await db
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", me)
      .is("read_at", null);
    await load();
  };
  const marcar = async (id: string) => {
    await db.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    setAvisos((v) => v.map((a) => (a.id === id ? { ...a, lido: true } : a)));
  };
  const apagar = async (id: string) => {
    await db.from("notifications").delete().eq("id", id);
    setAvisos((v) => v.filter((a) => a.id !== id));
  };

  return {
    avisos,
    ready,
    naoLidos: avisos.filter((a) => !a.lido).length,
    marcar,
    marcarTodos,
    apagar,
    reload: load,
  };
}

/** Só o número, para o sino do cabeçalho. */
export function useAvisosNaoLidos(me: string | null) {
  const [total, setTotal] = useState(0);
  useEffect(() => {
    if (!me) return;
    const ler = async () => {
      const { data } = await db.rpc("avisos_nao_lidos");
      setTotal(Number(data ?? 0));
    };
    void ler();
    const ch = db
      .channel("sino-" + me)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        void ler();
      })
      .subscribe();
    return () => {
      void db.removeChannel(ch);
    };
  }, [me]);
  return total;
}
