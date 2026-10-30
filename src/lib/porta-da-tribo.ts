import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { enderecoDaImagem } from "@/lib/covers";

/** pedidos_de_tribo ainda não está em types.ts. */
const db = supabase as unknown as SupabaseClient;

export type Entrada = "aberta" | "fechada";
export type MeuPedido = "pendente" | "aceito" | "recusado" | null;
export type Pedido = {
  userId: string;
  nome: string;
  avatar: string;
  cidade: string;
  recado: string;
  quando: string;
};

export const MAX_RECADO = 200;

/**
 * O que o botão deve dizer para esta pessoa nesta tribo.
 * Uma regra só, num lugar só: a tela não decide isso sozinha.
 */
export function portaDaTribo(opcoes: {
  souMembro: boolean;
  souCriadora: boolean;
  entrada: Entrada;
  meuPedido: MeuPedido;
  sensivel?: boolean | undefined;
  jaConsenti?: boolean | undefined;
}): "dentro" | "entrar" | "pedir" | "esperando" | "recusado" | "consentir" {
  const { souMembro, souCriadora, entrada, meuPedido } = opcoes;
  if (souMembro || souCriadora) return "dentro";
  // Tribo de política, religião ou orientação guarda dado sensível: a pessoa
  // precisa dizer sim a isso antes, e não junto com o aceite geral do cadastro.
  if (opcoes.sensivel && !opcoes.jaConsenti) return "consentir";
  if (entrada === "aberta") return "entrar";
  if (meuPedido === "pendente") return "esperando";
  if (meuPedido === "recusado") return "recusado";
  return "pedir";
}

export function recadoDaPorta(estado: ReturnType<typeof portaDaTribo>): string {
  if (estado === "consentir")
    return "Esta tribo diz algo sobre você que a lei trata com mais cuidado. Entrar é escolha sua, e só sua.";
  if (estado === "esperando") return "Seu pedido está com quem cuida da tribo.";
  if (estado === "recusado") return "Desta vez não deu. Você pode procurar outra tribo.";
  if (estado === "pedir") return "Esta tribo é fechada: quem cuida dela precisa aceitar.";
  return "";
}

export function useMinhaPorta(teiaId: number | null, me: string | null) {
  const [pedindo, setPedindo] = useState(false);

  const pedir = useCallback(
    async (recado: string) => {
      if (!teiaId || !me) return { ok: false, erro: "Entre na sua conta." };
      setPedindo(true);
      const { error } = await db
        .from("pedidos_de_tribo")
        .insert({ teia_id: teiaId, user_id: me, recado: recado.trim().slice(0, MAX_RECADO) });
      setPedindo(false);
      if (!error) return { ok: true as const };
      return {
        ok: false as const,
        erro: error.message.includes("duplicate")
          ? "Você já pediu para entrar nesta tribo."
          : "Não deu para enviar o pedido agora.",
      };
    },
    [teiaId, me],
  );

  const desistir = useCallback(async () => {
    if (!teiaId || !me) return false;
    const { error } = await db
      .from("pedidos_de_tribo")
      .delete()
      .eq("teia_id", teiaId)
      .eq("user_id", me);
    return !error;
  }, [teiaId, me]);

  return { pedir, desistir, pedindo };
}

export function usePedidosDaTribo(teiaId: number | null, souCriadora: boolean) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [ready, setReady] = useState(false);

  const carregar = useCallback(async () => {
    if (!teiaId || !souCriadora) {
      setReady(true);
      return;
    }
    const { data } = await db.rpc("pedidos_da_tribo", { _teia: teiaId });
    const linhas =
      (data as
        | {
            user_id: string;
            nickname: string | null;
            avatar_url: string | null;
            city: string | null;
            recado: string | null;
            quando: string;
          }[]
        | null) ?? [];
    setPedidos(
      linhas.map((l) => ({
        userId: l.user_id,
        nome: l.nickname || "Alguém da nommi",
        avatar: enderecoDaImagem(l.avatar_url || ""),
        cidade: l.city || "",
        recado: l.recado || "",
        quando: l.quando,
      })),
    );
    setReady(true);
  }, [teiaId, souCriadora]);
  useEffect(() => {
    void carregar();
  }, [carregar]);

  const responder = useCallback(
    async (quem: string, aceitar: boolean) => {
      if (!teiaId) return false;
      setPedidos((p) => p.filter((x) => x.userId !== quem));
      const { data, error } = await db.rpc("responder_pedido", {
        _teia: teiaId,
        _quem: quem,
        _aceitar: aceitar,
      });
      if (error || data === "erro") {
        await carregar();
        return false;
      }
      return true;
    },
    [teiaId, carregar],
  );

  return { pedidos, ready, responder, recarregar: carregar };
}
