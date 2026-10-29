import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** minhas_tribos e tribo_vista ainda não estão em types.ts. */
const db = supabase as unknown as SupabaseClient;

export type MinhaTribo = {
  id: number;
  nome: string;
  capa: string;
  membros: number;
  ultimaFala: string;
  ultimoAutor: string;
  ultimaEm: string | null;
  naoLidas: number;
};

/**
 * O que a linha da tribo diz, em uma frase.
 * Com recado novo, quem falou vem na frente: é o que faz a pessoa entrar.
 */
export function recadoDaTribo(t: MinhaTribo): string {
  if (t.ultimaFala) return `${t.ultimoAutor}: ${t.ultimaFala}`;
  if (t.membros <= 1) return "Ninguém falou ainda. Dá um oi.";
  return `${t.membros} pessoas aqui. Ninguém falou ainda.`;
}

/** Há quanto tempo foi a última fala, curto, do jeito que se fala. */
export function quandoFoi(iso: string | null, agora = Date.now()): string {
  if (!iso) return "";
  const min = Math.floor((agora - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ontem" : `${d} d`;
}

/** Tribo com recado novo muda de cor. Uma regra só, para a tela não inventar. */
export const temNovidade = (t: MinhaTribo) => t.naoLidas > 0;

/** O contador, com teto: acima de 99 vira "99+". */
export const contador = (n: number) => (n > 99 ? "99+" : String(Math.max(0, Math.floor(n))));

export async function marcarTriboVista(teiaKey: string | number) {
  await db.rpc("marcar_tribo_vista", { _teia: String(teiaKey) });
}

export function useMinhasTribos(ativo: boolean) {
  const [tribos, setTribos] = useState<MinhaTribo[]>([]);
  const [ready, setReady] = useState(false);

  const carregar = useCallback(async () => {
    if (!ativo) {
      setTribos([]);
      setReady(true);
      return;
    }
    const { data } = await db.rpc("minhas_tribos");
    const linhas =
      (data as
        | {
            id: number;
            nome: string;
            cover_path: string | null;
            membros: number;
            ultima_fala: string | null;
            ultimo_autor: string | null;
            ultima_em: string | null;
            nao_lidas: number;
          }[]
        | null) ?? [];
    setTribos(
      linhas.map((l) => ({
        id: l.id,
        nome: l.nome,
        capa: l.cover_path ?? "",
        membros: l.membros ?? 0,
        ultimaFala: l.ultima_fala ?? "",
        ultimoAutor: l.ultimo_autor ?? "",
        ultimaEm: l.ultima_em,
        naoLidas: l.nao_lidas ?? 0,
      })),
    );
    setReady(true);
  }, [ativo]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return { tribos, ready, recarregar: carregar };
}
