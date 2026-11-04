import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { enderecoDaImagem } from "./covers";
import type { Message } from "./friends-data";

type Reacao = { user_id: string };
type Row = {
  id: string;
  teia_key: string;
  sender_id: string;
  author: string;
  body: string | null;
  sticker: number | null;
  created_at: string;
  reacoes_de_mensagem?: Reacao[] | null;
};
type Member = { user_id: string; nickname: string };
/** Quem escreveu → foto. Sem isto toda mensagem da tribo mostrava o mesmo rosto. */
type Fotos = Record<string, string>;

/** Map a server message row to the chat Message shape for the current viewer. */
export function toMessage(row: Row, me: string, fotos: Fotos = {}): Message {
  const time = new Date(row.created_at).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const reacoes = row.reacoes_de_mensagem ?? [];
  const foto = fotos[row.sender_id];
  return {
    ...(row.body != null ? { text: row.body } : {}),
    ...(row.sticker != null ? { sticker: row.sticker } : {}),
    mine: row.sender_id === me,
    ...(row.sender_id === me ? {} : { author: row.author || "nommi" }),
    time,
    id: row.id,
    senderId: row.sender_id,
    ...(foto ? { authorAvatar: foto } : {}),
    coracoes: reacoes.length,
    euCurti: reacoes.some((r) => r.user_id === me),
  };
}

/** O que a tela pede do banco. A reação vem embutida: uma consulta, não uma por mensagem. */
const COLUNAS = "id,teia_key,sender_id,author,body,sticker,created_at,reacoes_de_mensagem(user_id)";

/** Real cross-account tribo: membership + messages stored in Lovable Cloud with live updates. */
export function useSharedTeia(teiaId: number, userId: string | null, nickname: string) {
  const key = String(teiaId);
  const [rows, setRows] = useState<Row[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [fotos, setFotos] = useState<Fotos>({});
  const [ready, setReady] = useState(false);
  const joined = !!userId && members.some((m) => m.user_id === userId);

  const loadMembers = useCallback(async () => {
    const { data } = await supabase
      .from("teia_members")
      .select("user_id,nickname")
      .eq("teia_key", key);
    setMembers(data ?? []);
  }, [key]);

  /**
   * Busca a foto de quem escreveu.
   *
   * Até 04/11 a bolha de quem não era você mostrava `<Avatar id={7} />` — uma
   * pessoa do conjunto da apresentação. Numa tribo de quarenta pessoas, todas
   * apareciam com o mesmo rosto de uma desconhecida, o Pippo incluído. É o
   * mesmo bug que o Felipe viu no perfil dele em 26/10, aqui dentro do chat.
   */
  const carregarFotos = useCallback(async (ids: string[]) => {
    const faltando = ids.filter((id) => id && !(id in fotos));
    if (!faltando.length) return;
    const { data } = await supabase
      .from("profiles")
      .select("id,avatar_url")
      .in("id", [...new Set(faltando)]);
    const novas: Fotos = {};
    for (const p of (data as { id: string; avatar_url: string | null }[] | null) ?? [])
      novas[p.id] = enderecoDaImagem(p.avatar_url ?? "");
    setFotos((antes) => ({ ...antes, ...novas }));
  }, [fotos]);

  const carregarMensagens = useCallback(async () => {
    const { data } = await supabase
      .from("teia_messages")
      .select(COLUNAS)
      .eq("teia_key", key)
      .order("created_at")
      .limit(200);
    const lista = (data as Row[] | null) ?? [];
    setRows(lista);
    void carregarFotos(lista.map((r) => r.sender_id));
    return lista;
  }, [key, carregarFotos]);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      await loadMembers();
      const { data } = await supabase
        .from("teia_messages")
        .select(COLUNAS)
        .eq("teia_key", key)
        .order("created_at")
        .limit(200);
      if (alive) {
        const lista = (data as Row[] | null) ?? [];
        setRows(lista);
        void carregarFotos(lista.map((r) => r.sender_id));
        setReady(true);
      }
    })();
    const channel = supabase
      .channel("tribo-" + key)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "teia_messages", filter: "teia_key=eq." + key },
        (p) => {
          const r = p.new as Row;
          setRows((prev) => (prev.some((x) => x.id === r.id) ? prev : [...prev, r]));
          void carregarFotos([r.sender_id]);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teia_members", filter: "teia_key=eq." + key },
        () => {
          void loadMembers();
        },
      )
      // O coração de outra pessoa aparece sem recarregar. Não há filtro por
      // tribo aqui (a tabela não tem a coluna), então a recarga confere se a
      // mensagem é desta tela antes de mexer em qualquer coisa.
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reacoes_de_mensagem" },
        (p) => {
          const alvo =
            (p.new as { mensagem_tribo?: string } | null)?.mensagem_tribo ??
            (p.old as { mensagem_tribo?: string } | null)?.mensagem_tribo;
          if (!alvo) return;
          setRows((prev) => {
            if (!prev.some((r) => r.id === alvo)) return prev;
            void carregarMensagens();
            return prev;
          });
        },
      )
      .subscribe();
    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
    // carregarFotos muda de identidade a cada foto nova; incluí-la aqui
    // desmontaria e remontaria o canal de tempo real sem parar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, userId, loadMembers]);

  // Reload messages once membership is granted (RLS hides them before joining).
  useEffect(() => {
    if (!joined) return;
    void carregarMensagens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined, key]);

  async function join() {
    if (!userId) return false;
    const { error } = await supabase
      .from("teia_members")
      .upsert({ teia_key: key, user_id: userId, nickname: nickname.slice(0, 40) });
    await loadMembers();
    return !error;
  }
  async function leave() {
    if (!userId) return;
    await supabase.from("teia_members").delete().eq("teia_key", key).eq("user_id", userId);
    setRows([]);
    await loadMembers();
  }
  async function send(m: Message) {
    if (!userId || (!m.text && m.sticker === undefined)) return false;
    const { data, error } = await supabase
      .from("teia_messages")
      .insert({
        teia_key: key,
        sender_id: userId,
        author: nickname.slice(0, 40),
        body: m.text?.slice(0, 1000) ?? null,
        sticker: m.sticker ?? null,
      })
      .select(COLUNAS)
      .single();
    if (data)
      setRows((prev) =>
        prev.some((x) => x.id === (data as Row).id) ? prev : [...prev, data as Row],
      );
    return !error;
  }

  /**
   * Dá ou tira o coração.
   *
   * A tela muda **antes** da resposta do servidor: curtir que espera a rede
   * não parece curtir, parece formulário. Se o banco recusar, desfaz.
   */
  async function curtir(mensagemId: string) {
    if (!userId) return;
    const atual = rows.find((r) => r.id === mensagemId);
    if (!atual) return;
    const tinha = (atual.reacoes_de_mensagem ?? []).some((r) => r.user_id === userId);
    setRows((prev) =>
      prev.map((r) =>
        r.id !== mensagemId
          ? r
          : {
              ...r,
              reacoes_de_mensagem: tinha
                ? (r.reacoes_de_mensagem ?? []).filter((x) => x.user_id !== userId)
                : [...(r.reacoes_de_mensagem ?? []), { user_id: userId }],
            },
      ),
    );
    const { error } = tinha
      ? await supabase
          .from("reacoes_de_mensagem")
          .delete()
          .eq("mensagem_tribo", mensagemId)
          .eq("user_id", userId)
      : await supabase
          .from("reacoes_de_mensagem")
          .insert({ mensagem_tribo: mensagemId, user_id: userId });
    if (error) void carregarMensagens();
  }

  return {
    ready,
    joined,
    members,
    messages: userId ? rows.map((r) => toMessage(r, userId, fotos)) : [],
    join,
    leave,
    send,
    curtir,
    recarregar: carregarMensagens,
  };
}
