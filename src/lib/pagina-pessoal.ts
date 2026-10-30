import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useState } from "react";
import { enderecoDaImagem } from "@/lib/covers";

export type PaginaPessoal = {
  id: string;
  nickname: string;
  city: string;
  about: string;
  interests: string[];
  places: string[];
  lookingFor: string;
  instagram: string;
  avatar: string;
  cover: string;
  background: string;
  verified: boolean;
  mode: string;
  tribosEmComum: string[];
  desde: string;
  video: string;
  figura: string;
  capaFoco: { x: number; y: number };
  fotoFoco: { x: number; y: number };
};

export const MAX_PLACES = 8;
export const MAX_LOOKING = 140;

/** Limpa o @ do Instagram: sem arroba, sem link, só o nome. */
export function cleanInstagram(v: string): string {
  return v
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[^A-Za-z0-9._]/g, "")
    .slice(0, 40);
}

/** Lista de lugares: tira repetidos e vazios, no máximo oito. */
export function cleanPlaces(list: string[]): string[] {
  const vistos = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const t = raw.trim().slice(0, 40);
    const chave = t.toLowerCase();
    if (!t || vistos.has(chave)) continue;
    vistos.add(chave);
    out.push(t);
    if (out.length === MAX_PLACES) break;
  }
  return out;
}

/** O quanto a página está preenchida, de 0 a 100: serve para convidar a completar. */
export function completeness(
  p: Pick<
    PaginaPessoal,
    "avatar" | "about" | "interests" | "places" | "lookingFor" | "city" | "cover"
  >,
): number {
  const itens = [
    !!p.avatar,
    !!p.about,
    p.interests.length > 0,
    p.places.length > 0,
    !!p.lookingFor,
    !!p.city,
    !!p.cover,
  ];
  return Math.round((itens.filter(Boolean).length / itens.length) * 100);
}

/** O que ainda falta, em palavras, para quem quiser completar. */
export function missingParts(
  p: Pick<
    PaginaPessoal,
    "avatar" | "about" | "interests" | "places" | "lookingFor" | "city" | "cover"
  >,
): string[] {
  const faltas: string[] = [];
  if (!p.avatar) faltas.push("uma foto sua");
  if (!p.about) faltas.push("uma frase sobre você");
  if (!p.interests.length) faltas.push("seus interesses");
  if (!p.places.length) faltas.push("lugares que você curte");
  if (!p.lookingFor) faltas.push("o que você procura");
  if (!p.city) faltas.push("sua cidade");
  if (!p.cover) faltas.push("uma capa");
  return faltas;
}

type Row = {
  id: string;
  nickname: string;
  city: string;
  about: string;
  interests: string[] | null;
  places: string[] | null;
  looking_for: string;
  instagram: string;
  avatar_url: string;
  cover_path: string;
  background_path: string;
  person_verified: boolean;
  profile_mode: string;
  tribos_em_comum: string[] | null;
  desde: string;
  video_path?: string | null;
  avatar_figura?: string | null;
  cover_x?: number | null;
  cover_y?: number | null;
  avatar_x?: number | null;
  avatar_y?: number | null;
};
export const toPagina = (r: Row): PaginaPessoal => ({
  id: r.id,
  nickname: r.nickname || "nommi",
  city: r.city ?? "",
  about: r.about ?? "",
  interests: r.interests ?? [],
  places: r.places ?? [],
  lookingFor: r.looking_for ?? "",
  instagram: r.instagram ?? "",
  avatar: enderecoDaImagem(r.avatar_url ?? ""),
  cover: r.cover_path ?? "",
  background: r.background_path ?? "",
  verified: !!r.person_verified,
  mode: r.profile_mode ?? "publico",
  tribosEmComum: r.tribos_em_comum ?? [],
  desde: r.desde,
  video: r.video_path ?? "",
  figura: r.avatar_figura ?? "",
  capaFoco: { x: r.cover_x ?? 50, y: r.cover_y ?? 50 },
  fotoFoco: { x: r.avatar_x ?? 50, y: r.avatar_y ?? 50 },
});

export function usePaginaPessoal(userId: string | null) {
  const [pagina, setPagina] = useState<PaginaPessoal | null>(null);
  const [ready, setReady] = useState(false);
  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.rpc("pagina_pessoal", { _user: userId });
    const linha = ((data as Row[] | null) ?? [])[0];
    setPagina(linha ? toPagina(linha) : null);
    setReady(true);
  }, [userId]);
  useEffect(() => {
    void load();
  }, [load]);
  return { pagina, ready, reload: load };
}

/** Salva o que só existe na página pessoal: lugares, o que procura e o @ do Instagram. */
export async function savePagina(
  userId: string,
  dados: { places?: string[]; lookingFor?: string; instagram?: string },
) {
  const update: { places?: string[]; looking_for?: string; instagram?: string } = {};
  if (dados.places) update.places = cleanPlaces(dados.places);
  if (dados.lookingFor !== undefined)
    update.looking_for = dados.lookingFor.trim().slice(0, MAX_LOOKING);
  if (dados.instagram !== undefined) update.instagram = cleanInstagram(dados.instagram);
  if (!Object.keys(update).length) return true;
  const { error } = await supabase.from("profiles").update(update).eq("id", userId);
  return !error;
}
