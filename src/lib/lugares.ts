import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { PLACES, km, type Place } from "./radar";

/** meus_lugares_de_sempre e lugares_da_cidade ainda não estão em types.ts. */
const db = supabase as unknown as SupabaseClient;

/**
 * De onde vêm os lugares do radar.
 *
 * O catálogo antigo eram 20 endereços escritos à mão, todos em Belo Horizonte.
 * Quem liga o radar em São Paulo, no Rio, em João Monlevade ou em Florianópolis
 * não recebia nada, e lia um texto pedindo desculpa. E em BH, a lista não tem
 * nada perto de vários bairros, então sugeria sempre o mesmo lugar longe.
 *
 * Escrever um catálogo do Brasil à mão seria inventar dado e envelheceria na
 * semana seguinte. Então o radar passa a ter três fontes, nesta ordem:
 *
 *   1. **Os seus lugares**, os que você já usou antes. É o que mais acerta: o
 *      café do trabalho, a praça perto de casa.
 *   2. **Os lugares da sua cidade** que já foram endereço de rolê ou tribo.
 *      Esses são públicos por natureza, e a lista cresce sozinha conforme a
 *      nommi chega em cada cidade.
 *   3. **O catálogo de BH**, e só quando a pessoa está de fato perto de BH.
 *
 * O que nunca entra: lugar onde **outra pessoa** esteve. Alguém pode escrever
 * "Casa da Bia" no radar, e isso é a casa de alguém. Lugar de rolê é endereço
 * de encontro; presença de outra pessoa não é, nunca.
 *
 * E escrever o nome do lugar deixa de ser desculpa e passa a ser o caminho
 * normal, porque é o que funciona em qualquer lugar do mundo.
 */

export type Sugestao = {
  nome: string;
  area: string;
  cidade: string;
  /** De onde veio, para a tela poder dizer e para não misturar as fontes. */
  fonte: "meu" | "cidade" | "catalogo";
};

/** O centro de Belo Horizonte, só para saber se o catálogo antigo faz sentido. */
export const CENTRO_DE_BH = { lat: -19.9227, lng: -43.9441 };

/**
 * O catálogo de BH só aparece para quem está perto de BH.
 *
 * Sem esse corte, `nearestPlace` respondia "BH Shopping" para quem está em
 * São Paulo, porque era o menos distante de uma lista que só tem BH. Dizer a
 * alguém em São Paulo que ela está no BH Shopping é pior que não dizer nada.
 */
export const RAIO_DO_CATALOGO_KM = 40;

export function pertoDeBH(lat: number, lng: number): boolean {
  return km({ lat, lng }, CENTRO_DE_BH) <= RAIO_DO_CATALOGO_KM;
}

/** O catálogo de BH, já em forma de sugestão, e só se a pessoa estiver perto. */
export function doCatalogo(lat: number, lng: number, limite = 6): Sugestao[] {
  if (!pertoDeBH(lat, lng)) return [];
  return PLACES.map((p) => ({ p, d: km({ lat, lng }, p) }))
    .filter((x) => x.d <= 12)
    .sort((a, b) => a.d - b.d)
    .slice(0, limite)
    .map((x) => ({ nome: x.p.name, area: x.p.area, cidade: "Belo Horizonte", fonte: "catalogo" }));
}

/** O lugar mais próximo do catálogo, ou nada se a pessoa não está em BH. */
export function maisPertoDeVerdade(lat: number, lng: number): Place | null {
  if (!pertoDeBH(lat, lng)) return null;
  const melhor = PLACES.reduce(
    (b, p) => (km({ lat, lng }, p) < km({ lat, lng }, b) ? p : b),
    PLACES[0] as Place,
  );
  return km({ lat, lng }, melhor) <= 2 ? melhor : null;
}

const limpar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * Junta as fontes sem repetir, na ordem de quem acerta mais.
 * Compara sem acento e sem maiúscula: "Café Savassi" e "cafe savassi" são o
 * mesmo lugar e as pessoas escrevem dos dois jeitos.
 */
export function juntarSugestoes(...listas: Sugestao[][]): Sugestao[] {
  const vistos = new Set<string>();
  const fora: Sugestao[] = [];
  for (const lista of listas) {
    for (const s of lista) {
      const chave = limpar(s.nome);
      if (!chave || vistos.has(chave)) continue;
      vistos.add(chave);
      fora.push(s);
    }
  }
  return fora;
}

/** Filtra pelo que a pessoa está escrevendo, sem exigir acento certo. */
export function filtrarSugestoes(todas: Sugestao[], escrito: string): Sugestao[] {
  const q = limpar(escrito);
  if (!q) return todas;
  return todas.filter((s) => limpar(s.nome).includes(q) || limpar(s.area).includes(q));
}

/**
 * O que a tela diz quando não há sugestão nenhuma.
 * Nunca pede desculpa por cidade: a nommi funciona em qualquer lugar, e
 * escrever o nome do lugar é o caminho normal, não o plano B.
 */
export function recadoDeLugar(temSugestao: boolean, cidade: string): string {
  if (temSugestao) return "Escolha um da lista ou escreva outro lugar.";
  if (cidade) return `Escreva onde você está em ${cidade}. Pode ser um café, uma praça, um shopping.`;
  return "Escreva onde você está. Pode ser um café, uma praça, um shopping.";
}

/** Nunca mandamos para o servidor o nome de um lugar vazio. */
export function nomeDoLugar(escrito: string): string {
  return escrito.trim().slice(0, 60);
}

export function useLugares(ativo: boolean, cidade: string) {
  const [meus, setMeus] = useState<Sugestao[]>([]);
  const [daCidade, setDaCidade] = useState<Sugestao[]>([]);
  const [ready, setReady] = useState(false);

  const carregar = useCallback(async () => {
    if (!ativo) {
      setMeus([]);
      setDaCidade([]);
      setReady(true);
      return;
    }
    const [m, c] = await Promise.all([
      db.rpc("meus_lugares_de_sempre", { _limite: 6 }),
      db.rpc("lugares_da_cidade", { _cidade: cidade, _limite: 10 }),
    ]);
    type LinhaMinha = { nome: string; area: string; cidade: string };
    type LinhaCidade = { nome: string; cidade: string };
    setMeus(
      (((m.data as LinhaMinha[] | null) ?? []) as LinhaMinha[]).map((l) => ({
        nome: l.nome,
        area: l.area ?? "",
        cidade: l.cidade ?? "",
        fonte: "meu" as const,
      })),
    );
    setDaCidade(
      (((c.data as LinhaCidade[] | null) ?? []) as LinhaCidade[]).map((l) => ({
        nome: l.nome,
        area: "",
        cidade: l.cidade ?? "",
        fonte: "cidade" as const,
      })),
    );
    setReady(true);
  }, [ativo, cidade]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return { meus, daCidade, ready, recarregar: carregar };
}
