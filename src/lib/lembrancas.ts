import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** lembrancas e meus_roles_vividos ainda não estão em types.ts. */
const db = supabase as unknown as SupabaseClient;

export const MAX_LEGENDA = 120;

export type Lembranca = {
  teiaId: number;
  nome: string;
  quando: string;
  cidade: string;
  foto: string;
  comQuem: string;
  legenda: string;
  guardada: boolean;
};

/**
 * A frase embaixo da foto: com quem a pessoa foi.
 * É isso que transforma uma foto de bar numa lembrança de amizade.
 */
export function comQuemFoi(l: Lembranca): string {
  if (l.legenda) return l.legenda;
  if (l.comQuem) return `com ${l.comQuem}`;
  return l.cidade ? `em ${l.cidade}` : "você foi";
}

/** O mês e o ano, do jeito curto. */
export function quandoFoiORole(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const meses = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];
  return `${d.getDate()} ${meses[d.getMonth()]}`;
}

export function limparLegenda(bruto: string): string {
  return String(bruto ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_LEGENDA);
}

export function useLembrancas(ativo: boolean) {
  const [lembrancas, setLembrancas] = useState<Lembranca[]>([]);
  const [ready, setReady] = useState(false);

  const carregar = useCallback(async () => {
    if (!ativo) {
      setLembrancas([]);
      setReady(true);
      return;
    }
    const { data } = await db.rpc("meus_roles_vividos");
    const linhas =
      (data as
        | {
            teia_id: number;
            nome: string;
            quando: string;
            cidade: string | null;
            foto: string | null;
            com_quem: string | null;
            legenda: string | null;
            guardada: boolean;
          }[]
        | null) ?? [];
    setLembrancas(
      linhas.map((l) => ({
        teiaId: l.teia_id,
        nome: l.nome,
        quando: l.quando,
        cidade: l.cidade ?? "",
        foto: l.foto ?? "",
        comQuem: l.com_quem ?? "",
        legenda: l.legenda ?? "",
        guardada: !!l.guardada,
      })),
    );
    setReady(true);
  }, [ativo]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const guardar = useCallback(
    async (l: Lembranca, legenda: string) => {
      const { error } = await db.rpc("guardar_lembranca", {
        _teia: l.teiaId,
        _path: l.foto,
        _legenda: limparLegenda(legenda),
      });
      if (!error) await carregar();
      return !error;
    },
    [carregar],
  );

  return { lembrancas, ready, guardar, recarregar: carregar };
}
