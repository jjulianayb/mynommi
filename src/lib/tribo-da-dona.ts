import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { FIGURINHAS } from "./figurinhas";

/** roles_da_tribo, tribo_publica e as colunas novas ainda não estão em types.ts. */
const db = supabase as unknown as SupabaseClient;

/**
 * A tribo é da dona.
 *
 * Quem cria escreve a missão, os valores e a visão, as próprias regras, escolhe
 * a figurinha e a capa, decide quem cria rolê, e tem um link para divulgar.
 *
 * Duas decisões que estão aqui e não na tela:
 *
 * - **O link público nasce desligado.** Se todas as tribos tivessem página
 *   aberta, bastaria varrer os números de id para listar tribo por tribo. A
 *   dona liga quando quiser divulgar.
 * - **Tribo sensível não tem link público**, nem se a dona pedir. Política,
 *   religião e orientação: uma página aberta dessas expõe o assunto de quem
 *   está lá, e quem entrou numa tribo dessas não escolheu isso.
 */

export const LIMITES = {
  missao: 300,
  valores: 300,
  visao: 300,
  regra: 600,
  sobre: 600,
} as const;

export type QuemCriaRole = "todos" | "criadora";

export type Personalizacao = {
  about: string;
  rule: string;
  missao: string;
  valores: string;
  visao: string;
  figurinha: string;
  who_posts: "todos" | "criadora";
  who_roles: QuemCriaRole;
  link_publico: boolean;
};

export const PERSONALIZACAO_VAZIA: Personalizacao = {
  about: "",
  rule: "",
  missao: "",
  valores: "",
  visao: "",
  figurinha: "",
  who_posts: "todos",
  who_roles: "todos",
  link_publico: false,
};

/** As figurinhas que a tribo pode usar como cara dela. Só ids do catálogo. */
export const FIGURINHAS_DE_TRIBO = FIGURINHAS;

/**
 * A figurinha da tribo é guardada como **nome do catálogo**, nunca como o
 * desenho e nunca como endereço de imagem. Nome que não está no catálogo não
 * desenha nada, em vez de virar texto solto na tela.
 */
export function desenhoDaFigurinha(nome: string): string {
  return FIGURINHAS.find((f) => f.nome === nome)?.fig ?? "";
}

/** Corta no limite da coluna e tira espaço sobrando. */
export function limpar(texto: string, limite: number): string {
  return texto.replace(/\s+\n/g, "\n").trim().slice(0, limite);
}

export function arrumarPersonalizacao(p: Personalizacao): Personalizacao {
  return {
    about: limpar(p.about, LIMITES.sobre),
    rule: limpar(p.rule, LIMITES.regra),
    missao: limpar(p.missao, LIMITES.missao),
    valores: limpar(p.valores, LIMITES.valores),
    visao: limpar(p.visao, LIMITES.visao),
    figurinha: desenhoDaFigurinha(p.figurinha) ? p.figurinha : "",
    who_posts: p.who_posts === "criadora" ? "criadora" : "todos",
    who_roles: p.who_roles === "criadora" ? "criadora" : "todos",
    link_publico: !!p.link_publico,
  };
}

/** Quanto da identidade da tribo já está escrita. Serve de convite, nunca de cobrança. */
export function quantoFalta(p: Personalizacao): { feitos: number; total: number } {
  const campos = [p.about, p.missao, p.valores, p.visao, p.rule, p.figurinha];
  return { feitos: campos.filter((c) => c.trim() !== "").length, total: campos.length };
}

/** O que a tela diz sobre o quanto a tribo está montada. */
export function recadoDaIdentidade(p: Personalizacao): string {
  const { feitos, total } = quantoFalta(p);
  if (feitos === 0) return "Conte do que é essa tribo. Quem chega decide por isso.";
  if (feitos >= total) return "Sua tribo está completa.";
  return `${feitos} de ${total} partes escritas. Pode parar e voltar depois.`;
}

/** O que diz o botão de quem cria rolê. */
export function recadoDeQuemCria(q: QuemCriaRole): string {
  return q === "todos"
    ? "Qualquer pessoa da tribo pode marcar um rolê."
    : "Só você marca rolê nesta tribo.";
}

/* ---- O link da tribo ---- */

/**
 * O endereço da página pública da tribo, para colar no Instagram, no WhatsApp,
 * onde a dona quiser.
 *
 * É endereço de página, não link de convite com código: código de convite é
 * pessoal e só pode ser usado uma vez. Um link de divulgação é usado por muita
 * gente, então leva para a página, e de lá cada pessoa cria a conta dela.
 */
export function linkDaTribo(origem: string, id: number): string {
  return `${origem.replace(/\/$/, "")}/tribo/${id}`;
}

/** O texto pronto para colar junto do link. */
export function textoDeDivulgacao(nome: string, cidade: string, link: string): string {
  const onde = cidade ? ` em ${cidade}` : "";
  return `Criei a tribo ${nome}${onde} na nommi, que é um app de amizade entre mulheres. Se quiser entrar: ${link}`;
}

/** Tribo sensível nunca tem página pública, nem se a dona ligar. */
export function podeTerLinkPublico(sensivel: boolean): boolean {
  return !sensivel;
}

export function recadoDoLink(sensivel: boolean, ligado: boolean): string {
  if (sensivel)
    return "Esta tribo trata de assunto delicado, então ela não tem página pública. Convide por link de convite, uma pessoa por vez.";
  if (ligado) return "A página está no ar. Qualquer pessoa com o link vê a tribo e pode criar conta para entrar.";
  return "Com a página ligada, você tem um endereço para divulgar nas suas redes.";
}

/* ---- Os rolês da tribo ---- */

export type RoleDaTribo = {
  id: number;
  name: string;
  place: string;
  city: string;
  when_text: string;
  starts_at: string | null;
  capacity: number | null;
  going_count: number;
  i_am_going: boolean;
  creator_nickname: string;
  i_am_creator: boolean;
  ja_passou: boolean;
};

/** Separa o que ainda vai acontecer do que já passou: a tela trata os dois diferente. */
export function separarRoles(roles: RoleDaTribo[]) {
  return {
    proximos: roles.filter((r) => !r.ja_passou),
    passados: roles.filter((r) => r.ja_passou),
  };
}

/** O que a aba de rolês diz quando não tem nenhum. */
export function recadoSemRole(euPodeCriar: boolean, quemCria: QuemCriaRole): string {
  if (euPodeCriar) return "Nenhum rolê marcado. Você pode marcar o primeiro.";
  return quemCria === "criadora"
    ? "Nenhum rolê marcado. Quem marca rolê aqui é quem criou a tribo."
    : "Nenhum rolê marcado ainda.";
}

export function useRolesDaTribo(triboId: number | null) {
  const [roles, setRoles] = useState<RoleDaTribo[]>([]);
  const [ready, setReady] = useState(false);

  const carregar = useCallback(async () => {
    if (!triboId) {
      setRoles([]);
      setReady(true);
      return;
    }
    const { data } = await db.rpc("roles_da_tribo", { _tribo: triboId });
    setRoles(((data as RoleDaTribo[] | null) ?? []).map((r) => ({ ...r })));
    setReady(true);
  }, [triboId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return { roles, ready, recarregar: carregar };
}

/* ---- A página pública ---- */

export type TriboPublica = {
  id: number;
  name: string;
  city: string;
  about: string;
  rule: string;
  missao: string;
  valores: string;
  visao: string;
  figurinha: string;
  cover_path: string | null;
  cover_x: number | null;
  cover_y: number | null;
  quantas: number;
  entrada: string;
  audience: string;
  oficial: boolean;
  dona: string;
};

export function useTriboPublica(id: number | null) {
  const [tribo, setTribo] = useState<TriboPublica | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!id) {
      setReady(true);
      return;
    }
    void (async () => {
      const { data } = await db.rpc("tribo_publica", { _id: id });
      setTribo(((data as TriboPublica[] | null) ?? [])[0] ?? null);
      setReady(true);
    })();
  }, [id]);

  return { tribo, ready };
}

/** Salva a personalização. Só a dona chega aqui; a trava de verdade é a política do banco. */
export async function salvarPersonalizacao(id: number, p: Personalizacao) {
  const arrumada = arrumarPersonalizacao(p);
  const { error } = await db.from("teias").update(arrumada).eq("id", id);
  return { ok: !error, arrumada };
}
