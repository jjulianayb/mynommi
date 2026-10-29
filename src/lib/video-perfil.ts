import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** videos_amigos e video_path ainda não estão em types.ts. */
const db = supabase as unknown as SupabaseClient;
const BALDE = "videos";

export const SEGUNDOS_DE_APRESENTACAO = 30;
export const MAX_VIDEO_BYTES = 30 * 1024 * 1024;

export type VideoDeAmigo = {
  id: string;
  de: string;
  quem: string;
  path: string;
  status: "pendente" | "no_ar" | "recusado";
  quando: string;
  url: string;
};

export const caminhoDoVideo = (userId: string, ext: string, agora = Date.now()) =>
  `${userId}/${agora}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

/** O que o perfil diz quando ainda não tem vídeo. Convite, não cobrança. */
export function conviteDoVideo(souDono: boolean, nome: string): string {
  if (souDono)
    return "Grave 30 segundos dizendo quem você é e que amizade você procura. É o que faz alguém querer te conhecer.";
  return `${nome} ainda não gravou. Quem é amizade pode gravar um vídeo falando dela.`;
}

export async function enviarVideo(
  userId: string,
  arquivo: Blob,
  ext: string,
): Promise<{ ok: true; path: string } | { ok: false; erro: string }> {
  if (arquivo.size > MAX_VIDEO_BYTES)
    return { ok: false, erro: "O vídeo ficou grande demais. Grave um mais curto." };
  const path = caminhoDoVideo(userId, ext);
  const up = await supabase.storage
    .from(BALDE)
    .upload(path, arquivo, { contentType: arquivo.type || "video/webm" });
  if (up.error) return { ok: false, erro: "O vídeo não subiu. Tente de novo." };
  return { ok: true, path };
}

export async function salvarMeuVideo(userId: string, path: string) {
  const { error } = await db.from("profiles").update({ video_path: path }).eq("id", userId);
  return !error;
}

export async function apagarMeuVideo(userId: string, path: string) {
  if (path) await supabase.storage.from(BALDE).remove([path]);
  const { error } = await db.from("profiles").update({ video_path: "" }).eq("id", userId);
  return !error;
}

/** Endereço assinado: o balde é fechado, então o link vale por um tempo. */
export async function enderecoDoVideo(path: string): Promise<string> {
  if (!path) return "";
  const { data } = await supabase.storage.from(BALDE).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? "";
}

export function useVideosDaPagina(dono: string | null, souDono: boolean) {
  const [videos, setVideos] = useState<VideoDeAmigo[]>([]);
  const [ready, setReady] = useState(false);

  const carregar = useCallback(async () => {
    if (!dono) return;
    const { data } = await db.rpc("videos_da_pagina", { _user: dono });
    const linhas = (data as Omit<VideoDeAmigo, "url">[] | null) ?? [];
    const comUrl = await Promise.all(
      linhas.map(async (l) => ({ ...l, url: await enderecoDoVideo(l.path) })),
    );
    setVideos(comUrl);
    setReady(true);
  }, [dono]);
  useEffect(() => {
    void carregar();
  }, [carregar]);

  const gravarSobre = useCallback(
    async (me: string, arquivo: Blob, ext: string) => {
      if (!dono) return { ok: false as const, erro: "Perfil não encontrado." };
      const envio = await enviarVideo(me, arquivo, ext);
      if (!envio.ok) return envio;
      const { error } = await db.from("videos_amigos").insert({ dono, de: me, path: envio.path });
      if (error) {
        await supabase.storage.from(BALDE).remove([envio.path]);
        return { ok: false as const, erro: "Só amizades podem gravar sobre alguém." };
      }
      await carregar();
      return { ok: true as const };
    },
    [dono, carregar],
  );

  const decidir = useCallback(
    async (id: string, noAr: boolean) => {
      if (!souDono) return false;
      const { error } = await db
        .from("videos_amigos")
        .update({ status: noAr ? "no_ar" : "recusado" })
        .eq("id", id);
      if (!error) await carregar();
      return !error;
    },
    [souDono, carregar],
  );

  const tirar = useCallback(
    async (v: VideoDeAmigo) => {
      const { error } = await db.from("videos_amigos").delete().eq("id", v.id);
      if (!error) await carregar();
      return !error;
    },
    [carregar],
  );

  const noAr = videos.filter((v) => v.status === "no_ar");
  const esperando = videos.filter((v) => v.status === "pendente");
  return { videos, noAr, esperando, ready, gravarSobre, decidir, tirar, recarregar: carregar };
}
