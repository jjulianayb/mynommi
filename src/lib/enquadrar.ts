import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** As colunas de enquadramento ainda não estão em types.ts. */
const db = supabase as unknown as SupabaseClient;

export type Enquadramento = { x: number; y: number };
export const CENTRO: Enquadramento = { x: 50, y: 50 };

/** Número que vai para dentro de uma regra de estilo: inteiro, de 0 a 100, sempre. */
export function limite(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export const paraCss = (e: Enquadramento) => `${limite(e.x)}% ${limite(e.y)}%`;

/** Arrastar para a direita mostra o que estava à esquerda: o foco anda ao contrário do dedo. */
export function moverFoco(
  atual: Enquadramento,
  dx: number,
  dy: number,
  largura: number,
  altura: number,
): Enquadramento {
  const w = Math.max(1, largura);
  const h = Math.max(1, altura);
  return {
    x: limite(atual.x - (dx / w) * 100),
    y: limite(atual.y - (dy / h) * 100),
  };
}

export async function salvarEnquadramento(
  userId: string,
  alvo: "capa" | "foto",
  e: Enquadramento,
): Promise<boolean> {
  const campos =
    alvo === "capa"
      ? { cover_x: limite(e.x), cover_y: limite(e.y) }
      : { avatar_x: limite(e.x), avatar_y: limite(e.y) };
  const { error } = await db.from("profiles").update(campos).eq("id", userId);
  return !error;
}

export async function salvarEnquadramentoDaTribo(
  teiaId: number,
  e: Enquadramento,
): Promise<boolean> {
  const { error } = await db
    .from("teias")
    .update({ cover_x: limite(e.x), cover_y: limite(e.y) })
    .eq("id", teiaId);
  return !error;
}
