import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** acessos e as funções do painel ainda não estão em types.ts. */
const db = supabase as unknown as SupabaseClient;

export type Numeros = {
  cadastrados: number;
  entraramSemana: number;
  ativosSemana: number;
  ativosMes: number;
  voltaram: number;
  diasPorPessoa: number;
  comFoto: number;
  comInteresses: number;
  amizades: number;
  amizadesSemana: number;
  conversas: number;
  tribosVivas: number;
  rolesFuturos: number;
  storiesSemana: number;
};

export const registrarAcesso = async () => {
  await db.rpc("registrar_acesso");
};

/** De cada 100 que se cadastraram, quantas voltaram outro dia. */
export function taxaDeVolta(n: Numeros): number {
  if (n.cadastrados === 0) return 0;
  return Math.round((n.voltaram / n.cadastrados) * 100);
}

/**
 * O número que importa num app de amizade não é cadastro: é quanta gente
 * virou amizade de verdade. Esta frase diz, sem rodeio, em que pé estamos.
 */
export function oQueOsNumerosDizem(n: Numeros): string {
  if (n.cadastrados < 5)
    return "Gente de menos para concluir qualquer coisa. Convide a primeira turma.";
  if (n.ativosSemana === 0)
    return "Ninguém abriu o app nesta semana. Isso é o alarme, não o cadastro.";
  if (n.amizades === 0)
    return "Tem gente entrando, mas ninguém virou amizade ainda. O match é o gargalo.";
  if (n.voltaram < n.cadastrados / 3)
    return "A maioria entrou e não voltou. Antes de trazer mais gente, descubra por quê.";
  if (n.conversas === 0)
    return "Viraram amizade e não conversaram. O problema está depois do match.";
  return "Gente entrando, voltando e conversando. Agora sim dá para trazer mais.";
}

export function useNumeros(souAdmin: boolean) {
  const [numeros, setNumeros] = useState<Numeros | null>(null);
  const [dias, setDias] = useState<{ dia: string; quantas: number }[]>([]);
  const [ready, setReady] = useState(false);

  const carregar = useCallback(async () => {
    if (!souAdmin) {
      setReady(true);
      return;
    }
    const [p, d] = await Promise.all([db.rpc("painel_de_numeros"), db.rpc("acessos_por_dia")]);
    type Linha = {
      cadastrados?: number; entraram_semana?: number; ativos_semana?: number; ativos_mes?: number;
      voltaram?: number; dias_por_pessoa?: number | string; com_foto?: number;
      com_interesses?: number; amizades?: number; amizades_semana?: number; conversas?: number;
      tribos_vivas?: number; roles_futuros?: number; stories_semana?: number;
    };
    const r = ((p.data as Linha[] | null) ?? [])[0];
    setNumeros(
      r
        ? {
            cadastrados: r.cadastrados ?? 0,
            entraramSemana: r.entraram_semana ?? 0,
            ativosSemana: r.ativos_semana ?? 0,
            ativosMes: r.ativos_mes ?? 0,
            voltaram: r.voltaram ?? 0,
            diasPorPessoa: Number(r.dias_por_pessoa ?? 0),
            comFoto: r.com_foto ?? 0,
            comInteresses: r.com_interesses ?? 0,
            amizades: r.amizades ?? 0,
            amizadesSemana: r.amizades_semana ?? 0,
            conversas: r.conversas ?? 0,
            tribosVivas: r.tribos_vivas ?? 0,
            rolesFuturos: r.roles_futuros ?? 0,
            storiesSemana: r.stories_semana ?? 0,
          }
        : null,
    );
    setDias(
      ((d.data as { dia: string; quantas: number }[] | null) ?? []).map((x) => ({
        dia: x.dia,
        quantas: x.quantas,
      })),
    );
    setReady(true);
  }, [souAdmin]);
  useEffect(() => {
    void carregar();
  }, [carregar]);

  return { numeros, dias, ready, recarregar: carregar };
}
