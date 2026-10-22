import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ConnectionRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
};
export type ConnectionState = "nenhuma" | "enviada" | "recebida" | "amigos";

/** Situação da conexão entre mim e outra pessoa. */
export function connectionState(row: ConnectionRow | undefined, me: string): ConnectionState {
  if (!row) return "nenhuma";
  if (row.status === "aceita") return "amigos";
  return row.requester_id === me ? "enviada" : "recebida";
}

export function otherId(row: ConnectionRow, me: string) {
  return row.requester_id === me ? row.addressee_id : row.requester_id;
}

/** Todas as minhas conexões (pedidos e amizades), atualizadas em tempo real. */
export function useConnections(me: string | null) {
  const [rows, setRows] = useState<ConnectionRow[]>([]);
  const [ready, setReady] = useState(false);
  const load = useCallback(async () => {
    if (!me) return;
    const { data } = await supabase
      .from("connections")
      .select("id,requester_id,addressee_id,status,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    setRows((data as ConnectionRow[] | null) ?? []);
    setReady(true);
  }, [me]);
  useEffect(() => {
    if (!me) return;
    void load();
    const ch = supabase
      .channel("connections-" + me)
      .on("postgres_changes", { event: "*", schema: "public", table: "connections" }, () => {
        void load();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [me, load]);
  const ask = async (to: string) => {
    const { error } = await supabase
      .from("connections")
      .insert({ requester_id: me!, addressee_id: to });
    await load();
    return !error;
  };
  const accept = async (id: string) => {
    const { error } = await supabase
      .from("connections")
      .update({ status: "aceita", accepted_at: new Date().toISOString() })
      .eq("id", id);
    await load();
    return !error;
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("connections").delete().eq("id", id);
    await load();
    return !error;
  };
  return { rows, ready, ask, accept, remove, reload: load };
}
