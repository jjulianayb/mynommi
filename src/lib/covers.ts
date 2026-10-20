import { supabase } from "@/integrations/supabase/client";
import { novo } from "./cloud-novo";

export type CoverSlot = "cover" | "background";
export const MAX_COVER_BYTES = 4 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const BUCKET = "covers";

/** Planos de fundo prontos da nommi, para quem não quer enviar foto. */
export const PRESET_BACKGROUNDS = [
  { id: "teia-verde", label: "Teia verde", css: "linear-gradient(160deg,#075E3B,#00A651)" },
  { id: "amanhecer", label: "Amanhecer", css: "linear-gradient(160deg,#FFDF00,#FF6B5B)" },
  { id: "papel", label: "Papel", css: "linear-gradient(160deg,#FAF9F6,#E8DDC4)" },
  { id: "noite", label: "Noite", css: "linear-gradient(160deg,#111111,#2E2E2E)" },
  { id: "cerrado", label: "Cerrado", css: "linear-gradient(160deg,#C9DFC9,#009C3B)" },
] as const;

export function coverProblem(file: { type: string; size: number }): string | null {
  if (!TYPES.includes(file.type)) return "Use uma imagem JPG, PNG ou WebP.";
  return file.size > MAX_COVER_BYTES ? "A imagem passa de 4 MB." : null;
}

export function coverPath(
  userId: string,
  slot: CoverSlot,
  target: "perfil" | number,
  type: string,
  now = Date.now(),
) {
  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  return `${userId}/${target === "perfil" ? "perfil" : "teia-" + target}-${slot}-${now}.${ext}`;
}

/** Um valor guardado pode ser um plano de fundo pronto ou um arquivo enviado. */
export function isPreset(value: string): boolean {
  return PRESET_BACKGROUNDS.some((p) => p.id === value);
}

/** Estilo pronto para aplicar: gradiente da nommi ou a foto enviada. */
export function coverStyle(value: string): {
  background?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
} {
  if (!value) return {};
  const preset = PRESET_BACKGROUNDS.find((p) => p.id === value);
  if (preset) return { background: preset.css };
  return {
    backgroundImage: `url(${publicUrl(value)})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

export function publicUrl(path: string): string {
  if (!path) return "";
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Envia a imagem e devolve o caminho guardado, ou null se falhar. */
export async function uploadCover(
  userId: string,
  slot: CoverSlot,
  target: "perfil" | number,
  file: File,
) {
  if (coverProblem(file)) return null;
  const path = coverPath(userId, slot, target, file.type);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  return error ? null : path;
}

export async function saveProfileCover(userId: string, slot: CoverSlot, value: string) {
  const { error } = await novo
    .from("profiles")
    .update({ [slot === "cover" ? "cover_path" : "background_path"]: value })
    .eq("id", userId);
  return !error;
}

export async function saveTeiaCover(teiaId: number, slot: CoverSlot, value: string) {
  const { error } = await novo
    .from("teias")
    .update({ [slot === "cover" ? "cover_path" : "background_path"]: value })
    .eq("id", teiaId);
  return !error;
}
