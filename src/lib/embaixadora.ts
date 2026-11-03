import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** embaixadoras e meu_titulo ainda não estão em types.ts. */
const db = supabase as unknown as SupabaseClient;

/**
 * Embaixadora: quem chegou no começo.
 *
 * O título é permanente e o número nunca se repete nem muda de dono. Mas o
 * número é só dela, não da vitrine: o selo que aparece no app é igual para
 * todas, sem número — assim ninguém identifica quem chegou primeiro
 * (decisão da Ju, 01/11).
 *
 * O que ele dá hoje é acesso às funcionalidades que um dia serão pagas.
 * Quem decide isso é `tem_premium()` no banco, num lugar só: nenhuma tela
 * pergunta "pagou?" por conta própria.
 *
 * O que ele **não** dá: aparecer mais no match, nem nada que crie duas classes
 * de gente. Numa rede de amizade isso se sente na hora.
 */

export type Titulo = {
  embaixadora: boolean;
  numero: number | null;
  vingaram: number;
  premium: boolean;
};

export const TITULO_VAZIO: Titulo = {
  embaixadora: false,
  numero: null,
  vingaram: 0,
  premium: false,
};

/** Como o título aparece na página: um selo só, igual para todas. */
export function selodeEmbaixadora(t: Titulo): string {
  if (!t.embaixadora) return "";
  return "Embaixadora";
}

/**
 * Selo de outra pessoa: é embaixadora? é pro? Número e data ficam no banco:
 * a API responde só os dois "é" ou "não é" (0055).
 */
export type Selo = { embaixadora: boolean; pro: boolean };

export const SELO_VAZIO: Selo = { embaixadora: false, pro: false };

/**
 * O aro dourado com coroa é o selo do Pro dado na mão, sem texto nenhum
 * (decisão da Ju, 03/11). Quem é embaixadora já tem o selo dela com nome;
 * o aro aparece só para quem é pro sem ser embaixadora, para as duas
 * marcas não brigarem no mesmo rosto.
 */
export function mostraAroPro(selo: Selo): boolean {
  return selo.pro && !selo.embaixadora;
}

export function useSeloDe(quem: string | undefined, ativo: boolean) {
  const [selo, setSelo] = useState<Selo>(SELO_VAZIO);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!ativo || !quem) {
      setSelo(SELO_VAZIO);
      setReady(true);
      return;
    }
    let alive = true;
    void (async () => {
      const { data } = await db.rpc("selo_de", { _quem: quem });
      if (!alive) return;
      const linha = ((data as Selo[] | null) ?? [])[0];
      setSelo(linha ? { embaixadora: !!linha.embaixadora, pro: !!linha.pro } : SELO_VAZIO);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [quem, ativo]);
  return { ...selo, ready };
}

/**
 * O contador de convites que vingaram.
 * Conta quem ficou, não quem foi chamado: contar envio premiaria espalhar
 * link, e link espalhado queima a nommi no WhatsApp.
 */
export function fraseDosConvites(vingaram: number): string {
  if (vingaram === 0) return "Ninguém entrou pelo seu convite ainda.";
  if (vingaram === 1) return "1 pessoa entrou na nommi pelo seu convite e ficou.";
  return `${vingaram} pessoas entraram na nommi pelo seu convite e ficaram.`;
}

/** O que dizer para incentivar sem pressionar. */
export function convidaMais(vingaram: number): string {
  if (vingaram === 0) return "Quem entra pelo seu link já chega conectada a você.";
  if (vingaram < 5) return "Cada uma que fica deixa a sua nommi mais com a sua cara.";
  return "A nommi que você está vendo foi você que montou.";
}

export function useMeuTitulo(ativo: boolean) {
  const [titulo, setTitulo] = useState<Titulo>(TITULO_VAZIO);
  const [ready, setReady] = useState(false);

  const carregar = useCallback(async () => {
    if (!ativo) {
      setTitulo(TITULO_VAZIO);
      setReady(true);
      return;
    }
    const { data } = await db.rpc("meu_titulo");
    const linha = ((data as Titulo[] | null) ?? [])[0];
    setTitulo(
      linha
        ? {
            embaixadora: !!linha.embaixadora,
            numero: linha.numero ?? null,
            vingaram: linha.vingaram ?? 0,
            premium: !!linha.premium,
          }
        : TITULO_VAZIO,
    );
    setReady(true);
  }, [ativo]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return { titulo, ready, recarregar: carregar };
}
