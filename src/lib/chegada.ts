import { useCallback, useEffect, useState } from "react";
import { novo } from "./cloud-novo";

export type TriboSugerida = {
  id: number;
  name: string;
  about: string;
  category: string;
  city: string;
  members: number;
  goal: number | null;
  iAmMember: boolean;
  emComum: number;
};
export type Pulso = {
  pessoas: number;
  tribos: number;
  rolesAbertos: number;
  encontrosMarcados: number;
  mensagensSemana: number;
  entraramSemana: number;
};

/** Quantas faltam para a tribo abrir a primeira roda. */
export function faltamPara(members: number, goal: number | null): number | null {
  if (goal == null) return null;
  return Math.max(0, goal - members);
}

/** A frase honesta da tribo: ou está aberta, ou falta gente, e isso vira convite. */
export function faseDaTribo(members: number, goal: number | null): string {
  const faltam = faltamPara(members, goal);
  if (faltam === null) return members === 1 ? "1 pessoa aqui" : `${members} pessoas aqui`;
  if (faltam === 0) return "Roda completa. Já dá para marcar";
  if (members === 0) return `Seja a primeira. Faltam ${faltam} para a primeira roda`;
  return `${members} ${members === 1 ? "pessoa" : "pessoas"} · faltam ${faltam} para a primeira roda`;
}

/** O que a nommi tem de verdade agora, em uma frase. Nada inventado. */
export function fraseDoPulso(p: Pulso): string {
  if (p.entraramSemana > 0)
    return `${p.entraramSemana} ${p.entraramSemana === 1 ? "pessoa entrou" : "pessoas entraram"} numa tribo esta semana`;
  if (p.rolesAbertos > 0)
    return `${p.rolesAbertos} ${p.rolesAbertos === 1 ? "rolê aberto" : "rolês abertos"} esperando gente`;
  return `${p.tribos} tribos abertas, esperando as primeiras rodas`;
}

/** Gera um código de convite curto e legível. */
export function novoCodigo(apelido: string): string {
  const base =
    apelido
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase()
      .slice(0, 6) || "NOMMI";
  const sorte = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}-${sorte}`;
}

export const linkDoConvite = (codigo: string, origem: string) =>
  `${origem}/conta?modo=criar&convite=${codigo}`;

/** Texto pronto para mandar no WhatsApp. */
export function textoDoConvite(apelido: string, link: string): string {
  return `Entrei na nommi, um app para fazer amizade de verdade: a gente entra numa tribo por interesse e marca de se encontrar. Vem comigo? ${link}`;
}

type LinhaTribo = {
  id: number;
  name: string;
  about: string;
  category: string;
  city: string;
  member_count: number;
  goal: number | null;
  i_am_member: boolean;
  em_comum: number;
};
type LinhaPulso = {
  pessoas: number;
  tribos: number;
  roles_abertos: number;
  encontros_marcados: number;
  mensagens_semana: number;
  entraram_semana: number;
};

export function useChegada(me: string | null) {
  const [sugeridas, setSugeridas] = useState<TriboSugerida[]>([]);
  const [pulso, setPulso] = useState<Pulso | null>(null);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    if (!me) return;
    const [{ data: t }, { data: p }] = await Promise.all([
      novo.rpc("tribos_para_mim", { _limite: 6 }),
      novo.rpc("pulso_da_nommi"),
    ]);
    setSugeridas(
      ((t as LinhaTribo[] | null) ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        about: r.about ?? "",
        category: r.category ?? "",
        city: r.city ?? "",
        members: r.member_count,
        goal: r.goal,
        iAmMember: r.i_am_member,
        emComum: r.em_comum,
      })),
    );
    const linha = ((p as LinhaPulso[] | null) ?? [])[0];
    setPulso(
      linha
        ? {
            pessoas: linha.pessoas,
            tribos: linha.tribos,
            rolesAbertos: linha.roles_abertos,
            encontrosMarcados: linha.encontros_marcados,
            mensagensSemana: linha.mensagens_semana,
            entraramSemana: linha.entraram_semana,
          }
        : null,
    );
    setReady(true);
  }, [me]);

  useEffect(() => {
    void load();
  }, [load]);

  const entrar = async (id: number, apelido: string) => {
    if (!me) return false;
    const { error } = await novo
      .from("teia_members")
      .upsert({ teia_key: String(id), user_id: me, nickname: apelido.slice(0, 40) });
    await load();
    return !error;
  };

  return { sugeridas, pulso, ready, entrar, reload: load };
}

/** Cria (ou reaproveita) o convite da pessoa. */
export async function meuConvite(me: string, apelido: string): Promise<string | null> {
  const { data } = await novo
    .from("invites")
    .select("code,used_by")
    .eq("owner_id", me)
    .is("used_by", null)
    .limit(1);
  const existente = ((data as { code: string }[] | null) ?? [])[0];
  if (existente) return existente.code;
  const code = novoCodigo(apelido);
  const { error } = await novo.from("invites").insert({ code, owner_id: me });
  return error ? null : code;
}
