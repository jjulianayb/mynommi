import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** gastar_figurinha ainda não está em types.ts (o Lovable regenera os tipos). */
const db = supabase as unknown as SupabaseClient;

/**
 * Créditos da figurinha do Pippo: 1 crédito por envio, Premium não gasta.
 *
 * O saldo e o desconto moram no banco (gastar_figurinha, migração 0044): a
 * tela só mostra e chama. Tela que desconta sozinha é tela que um console
 * aberto burla.
 */
export function useCreditosFigurinha(ativo: boolean, userId: string | undefined) {
  const [saldo, setSaldo] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    if (!ativo || !userId) {
      setSaldo(null);
      return;
    }
    const { data } = await db
      .from("credit_accounts")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();
    setSaldo((data as { balance: number } | null)?.balance ?? 0);
  }, [ativo, userId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  /**
   * Desconta 1 crédito por uma figurinha do Pippo. O banco confere o saldo e
   * deixa Premium passar de graça; aqui só atualizamos o número na tela.
   */
  const gastarFigurinha = useCallback(async (): Promise<boolean> => {
    const { data, error } = await db.rpc("gastar_figurinha");
    if (error || data !== true) return false;
    setSaldo((s) => (s === null ? s : Math.max(0, s - 1)));
    return true;
  }, []);

  return { saldo, gastarFigurinha, recarregar: carregar };
}
