import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as SupabaseClient;

export type StatusDenuncia = "aberta" | "analisada" | "arquivada";
export type Denuncia = {
  id: string;
  motivo: string;
  nota: string;
  status: StatusDenuncia;
  quando: string;
  quemDenunciou: string;
  alvoId: string | null;
  alvoNome: string;
  triboId: number | null;
  triboNome: string;
  denunciasContra: number;
};
export type ResumoModeracao = {
  abertas: number;
  analisadas: number;
  arquivadas: number;
  pessoasDenunciadas: number;
};

const MOTIVOS: Record<string, string> = {
  assedio: "Assédio ou desrespeito",
  golpe: "Golpe ou pedido de dinheiro",
  falso: "Perfil falso",
  inseguro: "Encontro ou lugar inseguro",
  outro: "Outro motivo",
};
export const motivoEmPalavras = (m: string) => MOTIVOS[m] ?? m;

/** Quanto mais denúncias contra a mesma pessoa, mais urgente. */
export function urgencia(d: Denuncia): "alta" | "media" | "baixa" {
  if (d.motivo === "assedio" || d.motivo === "inseguro" || d.denunciasContra >= 3) return "alta";
  if (d.denunciasContra >= 2 || d.motivo === "golpe") return "media";
  return "baixa";
}

/** Ordena a fila: urgente primeiro, depois a mais antiga, porque denúncia parada é problema. */
export function ordenarFila(lista: Denuncia[]): Denuncia[] {
  const peso = { alta: 0, media: 1, baixa: 2 } as const;
  return [...lista].sort(
    (a, b) => peso[urgencia(a)] - peso[urgencia(b)] || a.quando.localeCompare(b.quando),
  );
}

type Linha = {
  id: string;
  reason: string;
  note: string;
  status: StatusDenuncia;
  created_at: string;
  reporter: string;
  target_user: string | null;
  target_nome: string;
  target_teia: number | null;
  teia_nome: string;
  denuncias_contra: number;
};
export const toDenuncia = (r: Linha): Denuncia => ({
  id: r.id,
  motivo: r.reason,
  nota: r.note ?? "",
  status: r.status,
  quando: r.created_at,
  quemDenunciou: r.reporter || "nommi",
  alvoId: r.target_user,
  alvoNome: r.target_nome || "",
  triboId: r.target_teia,
  triboNome: r.teia_nome || "",
  denunciasContra: r.denuncias_contra ?? 0,
});

export function useModeracao(souAdmin: boolean, status: StatusDenuncia | "todas" = "aberta") {
  const [fila, setFila] = useState<Denuncia[]>([]);
  const [resumo, setResumo] = useState<ResumoModeracao | null>(null);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    if (!souAdmin) {
      setReady(true);
      return;
    }
    const [{ data: f }, { data: r }] = await Promise.all([
      db.rpc("fila_de_moderacao", { _status: status }),
      db.rpc("resumo_da_moderacao"),
    ]);
    setFila(ordenarFila(((f as Linha[] | null) ?? []).map(toDenuncia)));
    const linha = ((r as
      | { abertas: number; analisadas: number; arquivadas: number; pessoas_denunciadas: number }[]
      | null) ?? [])[0];
    setResumo(
      linha
        ? {
            abertas: linha.abertas,
            analisadas: linha.analisadas,
            arquivadas: linha.arquivadas,
            pessoasDenunciadas: linha.pessoas_denunciadas,
          }
        : null,
    );
    setReady(true);
  }, [souAdmin, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const tratar = async (id: string, novo: StatusDenuncia) => {
    const { error } = await db.from("reports").update({ status: novo }).eq("id", id);
    await load();
    return !error;
  };

  return { fila, resumo, ready, tratar, reload: load };
}
