import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ReportReason = "assedio" | "golpe" | "falso" | "inseguro" | "outro";
export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "assedio", label: "Assédio ou desrespeito" },
  { value: "golpe", label: "Golpe ou pedido de dinheiro" },
  { value: "falso", label: "Perfil falso" },
  { value: "inseguro", label: "Encontro ou lugar inseguro" },
  { value: "outro", label: "Outro motivo" },
];

export async function reportTarget(
  me: string,
  target: { userId?: string; teiaId?: number },
  reason: ReportReason,
  note = "",
) {
  if (!target.userId && target.teiaId == null) return false;
  if (target.userId === me) return false;
  const { error } = await supabase.from("reports").insert({
    reporter_id: me,
    target_user: target.userId ?? null,
    target_teia: target.teiaId ?? null,
    reason,
    note: note.trim().slice(0, 500),
  });
  return !error;
}

/** Pessoas que eu bloqueei. O bloqueio vale nos dois sentidos: nenhum dos dois vê o outro. */
export function useBlocks(me: string | null) {
  const [ids, setIds] = useState<string[]>([]);
  const load = useCallback(async () => {
    if (!me) return;
    const { data } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", me);
    setIds(((data as { blocked_id: string }[] | null) ?? []).map((x) => x.blocked_id));
  }, [me]);
  useEffect(() => {
    void load();
  }, [load]);
  const block = async (id: string) => {
    if (!me || id === me) return false;
    const { error } = await supabase.from("blocks").insert({ blocker_id: me, blocked_id: id });
    await load();
    return !error;
  };
  const unblock = async (id: string) => {
    if (!me) return false;
    const { error } = await supabase.from("blocks").delete().eq("blocker_id", me).eq("blocked_id", id);
    await load();
    return !error;
  };
  return {
    blockedIds: ids,
    isBlocked: (id: string) => ids.includes(id),
    block,
    unblock,
    reload: load,
  };
}
