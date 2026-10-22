import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Tabelas novas ainda fora de types.ts; quando o Lovable regerar, usar supabase direto. */
const db = supabase as unknown as SupabaseClient;

export type Presenca = {
  userId: string;
  nickname: string;
  avatar: string;
  declarou: string;
  confirmada: boolean;
  premiada: boolean;
  souEu: boolean;
};
export type Estrelas = { saldo: number; ganhasSemana: number; presencas: number };
export type ResultadoConfirmacao =
  "estrela" | "confirmada" | "ja_confirmada" | "sem_declaracao" | "nao_pode";

export const LIMITE_SEMANAL = 3;
export const DIAS_PARA_CONFIRMAR = 7;

/** O rolê já aconteceu e ainda dá para confirmar presença? */
export function janelaAberta(startsAt: string | null, agora = Date.now()): boolean {
  if (!startsAt) return false;
  const t = new Date(startsAt).getTime();
  return t <= agora && agora - t < DIAS_PARA_CONFIRMAR * 86400000;
}

/** A frase que explica o estado da presença para quem está olhando. */
export function fraseDaPresenca(p: Presenca): string {
  if (p.premiada) return "Presença confirmada · ganhou uma estrela";
  if (p.confirmada) return "Presença confirmada";
  return "Disse que esteve lá. Falta alguém confirmar";
}

/** O que dizer quando a confirmação volta do servidor. */
export function recadoDaConfirmacao(r: ResultadoConfirmacao, nome: string): string {
  if (r === "estrela") return `Presença de ${nome} confirmada. Ela ganhou uma estrela.`;
  if (r === "confirmada") return `Presença de ${nome} confirmada.`;
  if (r === "ja_confirmada") return "Essa presença já estava confirmada.";
  if (r === "sem_declaracao") return `${nome} ainda não disse que esteve lá.`;
  return "Só quem organizou ou quem esteve no rolê pode confirmar.";
}

type Linha = {
  user_id: string;
  declared_at: string;
  confirmed_by: string | null;
  rewarded: boolean;
};

export function usePresencas(me: string | null, roleId: number | null) {
  const [presencas, setPresencas] = useState<Presenca[]>([]);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    if (!me || roleId == null) return;
    const { data } = await db
      .from("attendances")
      .select("user_id,declared_at,confirmed_by,rewarded")
      .eq("teia_id", roleId);
    const linhas = (data as Linha[] | null) ?? [];
    const ids = linhas.map((l) => l.user_id);
    const quem = new Map<string, { nickname: string; avatar_url: string }>();
    if (ids.length) {
      const { data: ps } = await db.from("profiles").select("id,nickname,avatar_url").in("id", ids);
      for (const p of (ps as { id: string; nickname: string; avatar_url: string }[] | null) ?? [])
        quem.set(p.id, p);
    }
    setPresencas(
      linhas.map((l) => ({
        userId: l.user_id,
        nickname: quem.get(l.user_id)?.nickname || "nommi",
        avatar: quem.get(l.user_id)?.avatar_url ?? "",
        declarou: l.declared_at,
        confirmada: !!l.confirmed_by,
        premiada: l.rewarded,
        souEu: l.user_id === me,
      })),
    );
    setReady(true);
  }, [me, roleId]);

  useEffect(() => {
    void load();
  }, [load]);

  const estiveLa = async () => {
    if (!me || roleId == null) return false;
    const { error } = await db.from("attendances").insert({ teia_id: roleId, user_id: me });
    await load();
    return !error;
  };

  const confirmar = async (quem: string): Promise<ResultadoConfirmacao> => {
    if (roleId == null) return "nao_pode";
    const { data, error } = await db.rpc("confirmar_presenca", { _teia: roleId, _quem: quem });
    await load();
    return error ? "nao_pode" : ((data as ResultadoConfirmacao) ?? "nao_pode");
  };

  const souOrganizadora = async () => {
    if (roleId == null) return false;
    const { data } = await db.rpc("presenca_do_anfitriao", { _teia: roleId });
    await load();
    return data === "confirmada";
  };

  const minhaPresenca = presencas.find((p) => p.souEu) ?? null;
  return { presencas, ready, minhaPresenca, estiveLa, confirmar, souOrganizadora, reload: load };
}

export function useEstrelas(me: string | null) {
  const [estrelas, setEstrelas] = useState<Estrelas>({ saldo: 0, ganhasSemana: 0, presencas: 0 });
  const load = useCallback(async () => {
    if (!me) return;
    const { data } = await db.rpc("minhas_estrelas");
    const linha = ((data as { saldo: number; ganhas_semana: number; presencas: number }[] | null) ??
      [])[0];
    if (linha)
      setEstrelas({
        saldo: linha.saldo,
        ganhasSemana: linha.ganhas_semana,
        presencas: linha.presencas,
      });
  }, [me]);
  useEffect(() => {
    void load();
  }, [load]);
  return { estrelas, reload: load };
}
