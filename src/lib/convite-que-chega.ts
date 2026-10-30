import { useEffect, useRef } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as SupabaseClient;

/**
 * O convite que chega pelo link.
 *
 * O link de convite sempre carregou `?convite=CODIGO&tribo=ID`, e **nada no app
 * lia esses dois valores**. `usar_convite()` existia no banco desde o começo e
 * não era chamada por tela nenhuma. Então quem entrava por um link não virava
 * amiga de quem convidou, não caía dentro da tribo, e o contador de convites
 * que vingaram ficava em zero para sempre.
 *
 * O detalhe que faz isto precisar de cuidado: **o login do Google e da Apple
 * perde o endereço.** A pessoa sai da nommi, vai para a tela do Google, e volta
 * num endereço limpo, sem `?convite=`. Se o código só fosse lido na hora de
 * entrar, ele se perdia exatamente no caminho mais usado.
 *
 * Por isso o código é guardado no aparelho assim que a página abre, antes de
 * qualquer login, e usado depois, quando já existe conta. É a mesma lição do
 * erro de "Missing state parameter": o que precisa atravessar o login não pode
 * viver só na barra de endereço.
 */

const CHAVE = "nommi-convite";

/**
 * O que vem no link.
 *
 * `codigo` pode ser vazio: a página pública da tribo manda só `?tribo=`, sem
 * código de convite, porque link de divulgação é usado por muita gente e código
 * de convite vale uma vez só. Nesse caso não há amizade automática — só a
 * entrada na tribo.
 */
export type ConviteNaUrl = { codigo: string; tribo: number | null };

/** Lê o convite da barra de endereço. Aceita `?` ou o que vier depois dele. */
export function lerConviteDaUrl(search: string): ConviteNaUrl | null {
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const codigo = (q.get("convite") ?? "").trim().slice(0, 40);
  const bruto = q.get("tribo");
  const tribo = bruto && /^\d+$/.test(bruto) ? Number(bruto) : null;
  if (!codigo && tribo === null) return null;
  return { codigo, tribo };
}

/**
 * Guarda o convite para atravessar o login.
 * Guardar não é usar: se a pessoa desistir de criar conta, isto fica no
 * aparelho dela e não vale nada em lugar nenhum.
 */
export function guardarConvite(c: ConviteNaUrl): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(c));
  } catch {
    /* navegador sem espaço: o convite se perde, a conta ainda é criada */
  }
}

export function conviteGuardado(): ConviteNaUrl | null {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const v = JSON.parse(bruto) as Partial<ConviteNaUrl>;
    const codigo = String(v.codigo ?? "").trim();
    const tribo = typeof v.tribo === "number" ? v.tribo : null;
    if (!codigo && tribo === null) return null;
    return { codigo, tribo };
  } catch {
    return null;
  }
}

export function limparConvite(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    /* sem espaço, sem problema */
  }
}

/** Tira `convite` e `tribo` do endereço, para o código não ficar à vista nem ser recolado. */
export function enderecoSemConvite(href: string): string {
  try {
    const u = new URL(href);
    u.searchParams.delete("convite");
    u.searchParams.delete("tribo");
    return u.toString();
  } catch {
    return href;
  }
}

export type Resultado = { usou: boolean; entrouNaTribo: boolean };

/**
 * Usa o convite guardado, uma vez.
 *
 * `usar_convite()` no banco é que marca o convite, cria a amizade já aceita com
 * quem convidou e dá o título de embaixadora. Aqui só se chama a função e se
 * tenta entrar na tribo do link.
 *
 * Entrar na tribo pode falhar de propósito: tribo fechada não deixa ninguém
 * entrar sozinho, e tribo sensível pede consentimento antes. Nos dois casos a
 * pessoa segue para a tribo e a própria tela da tribo cuida do resto. Falha ao
 * entrar nunca desfaz o convite: a amizade com quem convidou é o que mais
 * importa.
 */
export async function usarConviteGuardado(apelido: string): Promise<Resultado> {
  const c = conviteGuardado();
  if (!c) return { usou: false, entrouNaTribo: false };
  limparConvite();

  // Sem código não há convite para usar: é alguém que chegou pela página
  // pública da tribo, e aí só a entrada na tribo faz sentido.
  let usou = false;
  if (c.codigo) {
    const { data } = await db.rpc("usar_convite", { _code: c.codigo });
    usou = data === true;
  }

  let entrouNaTribo = false;
  if (c.tribo) {
    const { error } = await db
      .from("teia_members")
      .insert({ teia_key: String(c.tribo), nickname: apelido });
    entrouNaTribo = !error;
  }
  return { usou, entrouNaTribo };
}

/** O recado de quem acabou de chegar por um convite. */
export function recadoDaChegada(r: Resultado, quemConvidou?: string): string {
  if (!r.usou) return r.entrouNaTribo ? "Você já está na tribo." : "";
  const amiga = quemConvidou
    ? `Você e ${quemConvidou} já são amigas aqui.`
    : "Você já chegou conectada a quem te convidou.";
  return r.entrouNaTribo ? `${amiga} E você já está na tribo.` : amiga;
}

/**
 * Guarda o convite assim que a página abre, com conta ou sem.
 * Fica no topo do app, antes de qualquer tela de login.
 */
export function useGuardarConviteDaUrl(): void {
  const feito = useRef(false);
  useEffect(() => {
    if (feito.current) return;
    feito.current = true;
    const c = lerConviteDaUrl(window.location.search);
    if (!c) return;
    guardarConvite(c);
    // Tira da barra de endereço para o código não ser recolado nem ficar no
    // histórico do navegador.
    window.history.replaceState({}, "", enderecoSemConvite(window.location.href));
  }, []);
}

/** Usa o convite guardado logo depois de a conta existir. Só uma vez por sessão. */
export function useConviteNaChegada(
  pronto: boolean,
  apelido: string,
  aoUsar?: (r: Resultado) => void,
): void {
  const feito = useRef(false);
  useEffect(() => {
    if (!pronto || feito.current || !conviteGuardado()) return;
    feito.current = true;
    void (async () => {
      const r = await usarConviteGuardado(apelido);
      if (r.usou || r.entrouNaTribo) aoUsar?.(r);
    })();
  }, [pronto, apelido, aoUsar]);
}
