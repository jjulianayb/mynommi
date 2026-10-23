import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** A tabela selos ainda não está em types.ts. */
const db = supabase as unknown as SupabaseClient;

export type Selo = { selo: string; quantos: number; euDei: boolean };

/**
 * Selos são o que os amigos dizem de alguém. Não é elogio solto: é o jeito do
 * app entender a pessoa por fora, porque ninguém se descreve direito.
 * Por isso a lista é curta e concreta — e nenhuma opção é ofensa.
 */
export const CATALOGO_DE_SELOS: { selo: string; fig: string }[] = [
  { selo: "ouve de verdade", fig: "👂" },
  { selo: "chama todo mundo", fig: "📣" },
  { selo: "topa qualquer rolê", fig: "🎒" },
  { selo: "cozinha bem", fig: "🍲" },
  { selo: "faz rir", fig: "😂" },
  { selo: "tem paciência", fig: "🧘" },
  { selo: "resolve tudo", fig: "🛠️" },
  { selo: "dá bons conselhos", fig: "💬" },
  { selo: "anima a mesa", fig: "🥂" },
  { selo: "boa de viagem", fig: "🧳" },
  { selo: "parceira de treino", fig: "🏃" },
  { selo: "indica filme bom", fig: "🎬" },
  { selo: "guarda segredo", fig: "🤐" },
  { selo: "chega cedo e fica até o fim", fig: "🌙" },
  { selo: "apresenta gente", fig: "🤝" },
  { selo: "lembra de todo mundo", fig: "🎂" },
];

const MAPA = new Map(CATALOGO_DE_SELOS.map((s) => [s.selo, s.fig]));
export const figuraDoSelo = (selo: string) => MAPA.get(selo.toLowerCase()) ?? "⭐";

/** Quantos selos até a página dizer alguma coisa de verdade. */
export const SELOS_PARA_VALER = 3;

export function recadoDosSelos(selos: Selo[], nome: string): string {
  if (selos.length === 0)
    return `Ninguém carimbou ${nome} ainda. Quem é amizade pode dizer como ela é.`;
  const total = selos.reduce((n, s) => n + s.quantos, 0);
  if (total < SELOS_PARA_VALER)
    return `${total} ${total === 1 ? "amiga disse" : "amigas disseram"} como ${nome} é.`;
  return `${total} pessoas já disseram como ${nome} é.`;
}

export function useSelos(userId: string | null) {
  const [selos, setSelos] = useState<Selo[]>([]);
  const [ready, setReady] = useState(false);

  const carregar = useCallback(async () => {
    if (!userId) return;
    const { data } = await db.rpc("selos_do_perfil", { _user: userId });
    const linhas = (data as { selo: string; quantos: number; eu_dei: boolean }[] | null) ?? [];
    setSelos(linhas.map((l) => ({ selo: l.selo, quantos: l.quantos, euDei: l.eu_dei })));
    setReady(true);
  }, [userId]);
  useEffect(() => {
    void carregar();
  }, [carregar]);

  const dar = useCallback(
    async (me: string, selo: string) => {
      if (!userId) return false;
      const { error } = await db.from("selos").insert({ dono: userId, de: me, selo });
      if (!error) await carregar();
      return !error;
    },
    [userId, carregar],
  );

  const tirar = useCallback(
    async (me: string, selo: string) => {
      if (!userId) return false;
      const { error } = await db
        .from("selos")
        .delete()
        .eq("dono", userId)
        .eq("de", me)
        .eq("selo", selo);
      if (!error) await carregar();
      return !error;
    },
    [userId, carregar],
  );

  return { selos, ready, dar, tirar, recarregar: carregar };
}
