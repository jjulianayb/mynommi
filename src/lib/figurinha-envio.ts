import { supabase } from "@/integrations/supabase/client";

/**
 * Figurinha criada no app virando mensagem de verdade. A imagem sobe no
 * bucket público "stickers" e a mensagem guarda só o caminho: quem lê monta
 * o endereço com urlFigurinha.
 */

/** Caminho da figurinha: sempre dentro da pasta de quem envia (regra do bucket). */
export function caminhoFigurinha(dona: string, onde: "conversa" | "tribo", agora = Date.now()): string {
  return `${dona}/${onde}-${agora}.webp`;
}

/** Converte o data-url do canvas em arquivo para subir. Null se o texto estiver quebrado. */
export function dataUrlParaBlob(dataUrl: string): Blob | null {
  const virgula = dataUrl.indexOf(",");
  if (!dataUrl.startsWith("data:") || virgula < 0) return null;
  try {
    const mime = dataUrl.slice(5, virgula).split(";")[0] || "image/webp";
    const bin = atob(dataUrl.slice(virgula + 1));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

/** Endereço público de uma figurinha já gravada. */
export function urlFigurinha(path: string): string {
  return supabase.storage.from("stickers").getPublicUrl(path).data.publicUrl;
}

type EnvioConversa = { de: string; para: string; src: string; legenda: string };
type EnvioTribo = { de: string; teiaKey: string; autor: string; src: string; legenda: string };

/** Sobe a figurinha criada e manda como mensagem (conversa a sós ou tribo). */
export async function enviarFigurinhaCriada(envio: EnvioConversa | EnvioTribo): Promise<boolean> {
  const blob = dataUrlParaBlob(envio.src);
  if (!blob) return false;
  const tribo = "teiaKey" in envio;
  const caminho = caminhoFigurinha(envio.de, tribo ? "tribo" : "conversa");
  const { error: erroUpload } = await supabase.storage
    .from("stickers")
    .upload(caminho, blob, { contentType: blob.type || "image/webp" });
  if (erroUpload) return false;
  const legenda = envio.legenda.trim().slice(0, 160) || null;
  const { error } = tribo
    ? await supabase.from("teia_messages").insert({
        teia_key: envio.teiaKey,
        sender_id: envio.de,
        author: envio.autor.slice(0, 40),
        body: null,
        sticker: null,
        sticker_path: caminho,
        sticker_legenda: legenda,
      })
    : await supabase.from("direct_messages").insert({
        sender_id: envio.de,
        recipient_id: envio.para,
        body: null,
        sticker: null,
        sticker_path: caminho,
        sticker_legenda: legenda,
      });
  return !error;
}
