import { supabase } from "@/integrations/supabase/client";

/**
 * Onde a foto de perfil fica guardada.
 *
 * Até aqui ela virava texto dentro da própria linha do perfil: a imagem
 * inteira, codificada, numa coluna. A maior em produção tem 93 mil caracteres.
 * Isso tem três problemas. A foto viaja junto em toda consulta que lê perfil,
 * mesmo quando ninguém vai mostrar a foto. Foto grande demais faz o salvamento
 * falhar, que é o que a Ana viu: umas fotos iam, outras não. E o navegador não
 * consegue guardar em cache uma imagem que muda de lugar junto com o perfil.
 *
 * Agora vira arquivo de verdade, no mesmo balde das capas, que já tem a regra
 * certa: cada pessoa só escreve dentro da própria pasta, e qualquer um pode
 * ver. Foto de perfil é pública por natureza — ela aparece na sua página.
 *
 * As fotos antigas continuam funcionando: `enderecoDaImagem()` sabe lidar com
 * as duas formas, e ninguém precisa reenviar nada.
 */

const BALDE = "covers";

/** Um nome por envio, para o navegador não mostrar a foto velha do cache. */
export function caminhoDaFotoDePerfil(userId: string, agora = Date.now()): string {
  const limpo = String(userId ?? "").replace(/[^a-zA-Z0-9-]/g, "");
  if (!limpo) return "";
  return `${limpo}/foto-${agora}.jpg`;
}

/** Já é arquivo no armazenamento, ou ainda é a foto antiga embutida? */
export const ehFotoEmArquivo = (valor: string) =>
  !!valor && !valor.startsWith("data:") && valor.includes("/");

/** O JPEG que o recorte devolveu vira arquivo para subir. */
export function jpegParaBlob(dataUrl: string): Blob | null {
  try {
    const virgula = dataUrl.indexOf(",");
    if (!dataUrl.startsWith("data:image/") || virgula < 0) return null;
    const binario = atob(dataUrl.slice(virgula + 1));
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return new Blob([bytes], { type: "image/jpeg" });
  } catch {
    return null;
  }
}

/**
 * Sobe a foto e devolve o caminho guardado.
 * Se o envio falhar, devolve null e quem chamou decide — nunca deixa a pessoa
 * sem foto nenhuma por causa de uma falha de rede.
 */
export async function enviarFotoDePerfil(
  userId: string,
  jpegDataUrl: string,
): Promise<string | null> {
  const caminho = caminhoDaFotoDePerfil(userId);
  const blob = jpegParaBlob(jpegDataUrl);
  if (!caminho || !blob) return null;
  const { error } = await supabase.storage
    .from(BALDE)
    .upload(caminho, blob, { contentType: "image/jpeg", upsert: true });
  return error ? null : caminho;
}

/** Tira do armazenamento a foto que acabou de ser substituída. */
export async function apagarFotoAntiga(valor: string): Promise<void> {
  if (!ehFotoEmArquivo(valor)) return;
  try {
    await supabase.storage.from(BALDE).remove([valor]);
  } catch {
    // Arquivo órfão não quebra nada; não vale travar a troca de foto por isso.
  }
}

/** O que a pessoa lê enquanto a foto sobe e quando dá errado. */
export function recadoDaFoto(fase: "subindo" | "pronta" | "sem_rede"): string {
  if (fase === "subindo") return "Mandando sua foto…";
  if (fase === "pronta") return "Foto trocada.";
  return "Sua foto apareceu aqui, mas não chegou no servidor. Toque em trocar foto para tentar de novo.";
}
