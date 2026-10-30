import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { enderecoDaImagem } from "@/lib/covers";

/** curtidas e as funções de combinar ainda não estão em types.ts. */
const db = supabase as unknown as SupabaseClient;

export type Candidata = {
  userId: string;
  nome: string;
  avatar: string;
  capa: string;
  cidade: string;
  sobre: string;
  interesses: string[];
  objetivos: string[];
  lugares: string[];
  procurando: string;
  verificada: boolean;
  emComum: string[];
  afinidade: number;
  mesmaCidade: boolean;
  jaMeCurtiu: boolean;
  fundo: string;
  tribosEmComum: number;
  fotoFoco: { x: number; y: number };
  selosEmComum: string[];
  selosDoPovo: string[];
};
export type Resposta = "match" | "guardado" | "passou" | "erro";

type Linha = {
  user_id: string;
  nickname: string | null;
  avatar_url: string | null;
  cover_path: string | null;
  city: string | null;
  about: string | null;
  interests: string[] | null;
  goals: string[] | null;
  places: string[] | null;
  looking_for: string | null;
  person_verified: boolean | null;
  em_comum: string[] | null;
  afinidade: number | null;
  mesma_cidade: boolean | null;
  ja_me_curtiu: boolean | null;
  background_path?: string | null;
  tribos_em_comum?: number | null;
  selos_em_comum?: string[] | null;
  selos_do_povo?: string[] | null;
  avatar_x?: number | null;
  avatar_y?: number | null;
};

export const toCandidata = (r: Linha): Candidata => ({
  userId: r.user_id,
  nome: r.nickname || "Alguém da nommi",
  avatar: enderecoDaImagem(r.avatar_url || ""),
  capa: r.cover_path || "",
  cidade: r.city || "",
  sobre: r.about || "",
  interesses: r.interests ?? [],
  objetivos: r.goals ?? [],
  lugares: r.places ?? [],
  procurando: r.looking_for || "",
  verificada: r.person_verified === true,
  emComum: r.em_comum ?? [],
  afinidade: r.afinidade ?? 0,
  mesmaCidade: r.mesma_cidade === true,
  jaMeCurtiu: r.ja_me_curtiu === true,
  fundo: r.background_path || "",
  tribosEmComum: r.tribos_em_comum ?? 0,
  fotoFoco: { x: r.avatar_x ?? 50, y: r.avatar_y ?? 50 },
  selosEmComum: r.selos_em_comum ?? [],
  selosDoPovo: r.selos_do_povo ?? [],
});

/**
 * Por que esta pessoa apareceu. Sem porcentagem inventada: ou há interesse em
 * comum, ou é a mesma cidade, ou é gente nova — e a frase diz qual dos três é.
 */
export function porqueApareceu(c: Candidata): string {
  const n = c.emComum.length;
  if (n >= 3) return `Vocês gostam das mesmas coisas: ${c.emComum.slice(0, 3).join(", ")}`;
  if (n === 2) return `Vocês dois gostam de ${c.emComum[0]} e ${c.emComum[1]}`;
  if (n === 1) return `Vocês dois gostam de ${c.emComum[0]}`;
  if (c.selosEmComum.length > 0) return `Os amigos de vocês dois dizem: ${c.selosEmComum[0]}`;
  if (c.tribosEmComum > 0)
    return c.tribosEmComum === 1
      ? "Vocês estão na mesma tribo"
      : `Vocês estão em ${c.tribosEmComum} tribos juntas`;
  if (c.mesmaCidade && c.cidade) return `Está em ${c.cidade}, como você`;
  return "Chegou agora na nommi";
}

/** O que dizer depois da resposta. Ninguém é avisado de que foi passado. */
export function recadoDaResposta(r: Resposta, nome: string): string {
  if (r === "match") return `Deu match com ${nome}.`;
  if (r === "guardado")
    return "Guardamos sua resposta. Se a pessoa também quiser, vocês dois ficam sabendo.";
  if (r === "passou") return "Tudo bem. Vamos ver outra pessoa.";
  return "Não deu para enviar agora.";
}

/** Interesses em comum na frente, o resto depois: é o que a pessoa olha primeiro. */
export function interessesOrdenados(c: Candidata): { nome: string; comum: boolean }[] {
  const comuns = new Set(c.emComum);
  return [
    ...c.emComum.map((nome) => ({ nome, comum: true })),
    ...c.interesses.filter((i) => !comuns.has(i)).map((nome) => ({ nome, comum: false })),
  ];
}

/** O arrasto só decide quando foi longe o bastante; abaixo disso o cartão volta. */
export function decisaoDoArrasto(dx: number, largura: number): "sim" | "nao" | null {
  const limite = Math.max(80, largura * 0.28);
  if (dx >= limite) return "sim";
  if (dx <= -limite) return "nao";
  return null;
}

export function useCombinar(souReal: boolean) {
  const [fila, setFila] = useState<Candidata[]>([]);
  const [curiosidade, setCuriosidade] = useState(0);
  const [ready, setReady] = useState(false);

  const carregar = useCallback(async () => {
    if (!souReal) {
      setReady(true);
      return;
    }
    const [p, q] = await Promise.all([
      db.rpc("pessoas_para_combinar", { _limite: 30 }),
      db.rpc("quem_tem_curiosidade"),
    ]);
    setFila(((p.data as Linha[] | null) ?? []).map(toCandidata));
    setCuriosidade(typeof q.data === "number" ? q.data : 0);
    setReady(true);
  }, [souReal]);
  useEffect(() => {
    void carregar();
  }, [carregar]);

  /** Tira a pessoa da fila na hora: ninguém quer ver duas vezes quem já respondeu. */
  const responder = useCallback(async (quem: Candidata, sim: boolean): Promise<Resposta> => {
    setFila((f) => f.filter((c) => c.userId !== quem.userId));
    setCuriosidade((n) => (quem.jaMeCurtiu && n > 0 ? n - 1 : n));
    const { data, error } = await db.rpc("responder_pessoa", { _para: quem.userId, _sim: sim });
    if (error) return "erro";
    return (data as Resposta) ?? "erro";
  }, []);

  return { fila, curiosidade, ready, responder, recarregar: carregar };
}
