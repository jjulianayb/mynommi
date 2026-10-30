import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** profiles.apresentacao ainda não está em types.ts. */
const db = supabase as unknown as SupabaseClient;

/**
 * Quem ainda não se apresentou vê a apresentação uma vez.
 * "pulou" conta como visto: ninguém é cobrado duas vezes pela mesma coisa.
 */
export function usePrecisaApresentar(ativo: boolean, userId: string | null) {
  const [precisa, setPrecisa] = useState(false);

  useEffect(() => {
    if (!ativo || !userId) {
      setPrecisa(false);
      return;
    }
    let vivo = true;
    void (async () => {
      const { data } = await db
        .from("profiles")
        .select("apresentacao")
        .eq("id", userId)
        .maybeSingle();
      if (!vivo) return;
      const estado = (data as { apresentacao?: string } | null)?.apresentacao ?? "pendente";
      setPrecisa(estado === "pendente");
    })();
    return () => {
      vivo = false;
    };
  }, [ativo, userId]);

  const encerrar = useCallback(() => setPrecisa(false), []);
  return { precisa, encerrar };
}
