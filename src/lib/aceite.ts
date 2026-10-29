import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { VERSAO_DOS_TEXTOS } from "./politica";

/** aceites e registrar_aceite ainda não estão em types.ts. */
const db = supabase as unknown as SupabaseClient;

export type Aceite = { documento: string; versao: string };

/**
 * Quem já aceitou a versão que está no ar não vê nada. Quem nunca aceitou, e
 * quem aceitou um texto antigo, precisa ver o novo antes de continuar — foi o
 * que a própria política prometeu: "avisa dentro do app antes de valer".
 */
export function precisaAceitar(aceites: Aceite[], versao = VERSAO_DOS_TEXTOS) {
  const tem = (d: string) => aceites.some((a) => a.documento === d && a.versao === versao);
  return !tem("termos") || !tem("privacidade");
}

/** A data de nascimento vive no cadastro desde sempre; o banco só passou a guardar agora. */
export function nascimentoDoCadastro(meta: Record<string, unknown> | undefined) {
  const v = meta?.["birthday"];
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

export async function registrarAceites(versao = VERSAO_DOS_TEXTOS) {
  await Promise.all([
    db.rpc("registrar_aceite", { _documento: "termos", _versao: versao }),
    db.rpc("registrar_aceite", { _documento: "privacidade", _versao: versao }),
  ]);
}

export async function registrarAceiteDeTribo(teiaId: number | string, versao = VERSAO_DOS_TEXTOS) {
  const { error } = await db.rpc("registrar_aceite", {
    _documento: "tribo_sensivel",
    _versao: versao,
    _alvo: String(teiaId),
  });
  return !error;
}

/** Guarda no banco a data de nascimento que já estava no cadastro. */
export async function guardarNascimento(userId: string, nascimento: string) {
  const { error } = await db.from("profiles").update({ nascimento }).eq("id", userId);
  return !error;
}

export function useAceite(ativo: boolean, userId: string | null) {
  const [pendente, setPendente] = useState(false);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    if (!ativo || !userId) {
      setPendente(false);
      setPronto(false);
      return;
    }
    let vivo = true;
    void (async () => {
      const { data } = await db.from("aceites").select("documento,versao").eq("user_id", userId);
      if (!vivo) return;
      setPendente(precisaAceitar((data as Aceite[]) ?? []));
      setPronto(true);
      // Enquanto estamos aqui: a data de nascimento do cadastro passa a viver no
      // banco, onde a trava de 18 anos consegue conferir.
      const { data: u } = await supabase.auth.getUser();
      const nasc = nascimentoDoCadastro(u.user?.user_metadata);
      if (nasc) void guardarNascimento(userId, nasc);
    })();
    return () => {
      vivo = false;
    };
  }, [ativo, userId]);

  const aceitar = useCallback(async () => {
    await registrarAceites();
    setPendente(false);
  }, []);

  return { pendente, pronto, aceitar };
}
