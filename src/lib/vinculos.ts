import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Os três vínculos que a própria pessoa pode listar no Meu Nommi. */
export type TipoVinculo = "seguidores" | "seguindo" | "amigos";

export type PessoaDaLista = { id: string; nickname: string | null; avatar_url: string | null };

export const TITULO_VINCULO: Record<TipoVinculo, string> = {
  seguidores: "Quem te segue",
  seguindo: "Quem você segue",
  amigos: "Suas amizades",
};

export const VAZIO_VINCULO: Record<TipoVinculo, string> = {
  seguidores: "Quando alguém te seguir, a pessoa aparece aqui.",
  seguindo: "Você ainda não segue ninguém. Que tal começar pela Tribo do Pippo?",
  amigos: "Suas amizades aparecem aqui quando forem aceitas.",
};

/** Quem é a outra ponta de uma conexão aceita. */
export function outroDaConexao(
  row: { requester_id: string; addressee_id: string },
  me: string,
): string {
  return row.requester_id === me ? row.addressee_id : row.requester_id;
}

/** Preserva a ordem original dos vínculos e descarta quem não deu para identificar. */
export function emOrdem(ids: string[], pessoas: PessoaDaLista[]): PessoaDaLista[] {
  const mapa = new Map(pessoas.map((p) => [p.id, p]));
  return ids.filter((id) => mapa.has(id)).map((id) => mapa.get(id)!);
}

async function idsDoVinculo(me: string, tipo: TipoVinculo): Promise<string[]> {
  if (tipo === "seguidores") {
    const { data } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("followed_id", me)
      .limit(200);
    return ((data as { follower_id: string }[] | null) ?? []).map((r) => r.follower_id);
  }
  if (tipo === "seguindo") {
    const { data } = await supabase
      .from("follows")
      .select("followed_id")
      .eq("follower_id", me)
      .limit(200);
    return ((data as { followed_id: string }[] | null) ?? []).map((r) => r.followed_id);
  }
  const { data } = await supabase
    .from("connections")
    .select("requester_id,addressee_id")
    .eq("status", "aceita")
    .or(`requester_id.eq.${me},addressee_id.eq.${me}`)
    .limit(500);
  return ((data as { requester_id: string; addressee_id: string }[] | null) ?? []).map((r) =>
    outroDaConexao(r, me),
  );
}

/**
 * Lista os vínculos da PRÓPRIA pessoa (a RLS só libera os próprios vínculos e
 * perfis públicos; perfil privado de terceiro simplesmente não aparece).
 */
export function useVinculos(me: string | null, tipo: TipoVinculo | null) {
  const [pessoas, setPessoas] = useState<PessoaDaLista[]>([]);
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    if (!me || !tipo) return;
    let vivo = true;
    setPronto(false);
    void (async () => {
      const ids = await idsDoVinculo(me, tipo);
      if (!ids.length) {
        if (vivo) {
          setPessoas([]);
          setPronto(true);
        }
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id,nickname,avatar_url")
        .in("id", ids)
        .limit(200);
      if (!vivo) return;
      setPessoas(emOrdem(ids, (data as PessoaDaLista[] | null) ?? []));
      setPronto(true);
    })();
    return () => {
      vivo = false;
    };
  }, [me, tipo]);
  return { pessoas, pronto };
}
