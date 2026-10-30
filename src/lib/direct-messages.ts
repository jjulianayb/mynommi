import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useState } from "react";
import { enderecoDaImagem } from "@/lib/covers";

export type DirectMessage = {
  id: string;
  body: string | null;
  sticker: number | null;
  mine: boolean;
  createdAt: string;
  readAt: string | null;
};
export type Conversa = {
  outroId: string;
  nickname: string;
  avatar: string;
  ultima: string | null;
  ultimaSticker: number | null;
  ultimaMinha: boolean | null;
  ultimaEm: string | null;
  naoLidas: number;
};

export const MAX_MESSAGE = 1000;

/** Texto da mensagem: de 1 a 1000 letras, sem espaços sobrando. */
export function cleanMessage(text: string): string | null {
  const t = text.replace(/\s+\n/g, "\n").trim();
  return t.length >= 1 && t.length <= MAX_MESSAGE ? t : null;
}

/** Resumo da conversa na lista: o texto, ou "Figurinha", ou o convite para começar. */
export function previewOf(c: Pick<Conversa, "ultima" | "ultimaSticker" | "ultimaMinha">): string {
  if (c.ultima) return (c.ultimaMinha ? "Você: " : "") + c.ultima;
  if (c.ultimaSticker != null) return (c.ultimaMinha ? "Você: " : "") + "Figurinha";
  return "Diga oi para começar.";
}

/** Hora curta para a bolha: 14:32. */
export function hourOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Dia da conversa, para separar as mensagens: Hoje, Ontem ou a data. */
export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const dia = (x: Date) => x.toISOString().slice(0, 10);
  const ontem = new Date(now.getTime() - 86400000);
  if (dia(d) === dia(now)) return "Hoje";
  if (dia(d) === dia(ontem)) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

type Row = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string | null;
  sticker: number | null;
  created_at: string;
  read_at: string | null;
};
export const toMessage = (r: Row, me: string): DirectMessage => ({
  id: r.id,
  body: r.body,
  sticker: r.sticker,
  mine: r.sender_id === me,
  createdAt: r.created_at,
  readAt: r.read_at,
});

type ConversaRow = {
  outro_id: string;
  nickname: string;
  avatar_url: string;
  ultima: string | null;
  ultima_sticker: number | null;
  ultima_minha: boolean | null;
  ultima_em: string | null;
  nao_lidas: number;
};
export const toConversa = (r: ConversaRow): Conversa => ({
  outroId: r.outro_id,
  nickname: r.nickname || "nommi",
  avatar: enderecoDaImagem(r.avatar_url || ""),
  ultima: r.ultima,
  ultimaSticker: r.ultima_sticker,
  ultimaMinha: r.ultima_minha,
  ultimaEm: r.ultima_em,
  naoLidas: r.nao_lidas ?? 0,
});

/** Lista de conversas: uma por amizade, atualizada em tempo real. */
export function useConversas(me: string | null) {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [ready, setReady] = useState(false);
  const load = useCallback(async () => {
    if (!me) return;
    const { data } = await supabase.rpc("minhas_conversas");
    setConversas(((data as ConversaRow[] | null) ?? []).map(toConversa));
    setReady(true);
  }, [me]);
  useEffect(() => {
    if (!me) return;
    void load();
    const ch = supabase
      .channel("dm-lista-" + me)
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, () => {
        void load();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [me, load]);
  const total = conversas.reduce((n, c) => n + c.naoLidas, 0);
  return { conversas, ready, total, reload: load };
}

/** A conversa com uma pessoa: carrega, recebe ao vivo e marca como lida. */
export function useConversa(me: string | null, outroId: string | null) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    if (!me || !outroId) return;
    const { data } = await supabase
      .from("direct_messages")
      .select("id,sender_id,recipient_id,body,sticker,created_at,read_at")
      .or(
        `and(sender_id.eq.${me},recipient_id.eq.${outroId}),and(sender_id.eq.${outroId},recipient_id.eq.${me})`,
      )
      .order("created_at")
      .limit(300);
    setMessages(((data as Row[] | null) ?? []).map((r) => toMessage(r, me)));
    setReady(true);
  }, [me, outroId]);

  const markRead = useCallback(async () => {
    if (!me || !outroId) return;
    await supabase
      .from("direct_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("sender_id", outroId)
      .eq("recipient_id", me)
      .is("read_at", null);
  }, [me, outroId]);

  useEffect(() => {
    if (!me || !outroId) return;
    void load().then(markRead);
    const ch = supabase
      .channel(`dm-${me}-${outroId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (p: { new: Row }) => {
          const r = p.new;
          const daConversa =
            (r.sender_id === me && r.recipient_id === outroId) ||
            (r.sender_id === outroId && r.recipient_id === me);
          if (!daConversa) return;
          setMessages((prev) =>
            prev.some((m) => m.id === r.id) ? prev : [...prev, toMessage(r, me)],
          );
          if (r.sender_id === outroId) void markRead();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [me, outroId, load, markRead]);

  const send = async (input: { text?: string; sticker?: number }) => {
    if (!me || !outroId) return false;
    const body = input.text ? cleanMessage(input.text) : null;
    if (!body && input.sticker == null) return false;
    const { error } = await supabase
      .from("direct_messages")
      .insert({ sender_id: me, recipient_id: outroId, body, sticker: input.sticker ?? null });
    if (!error) await load();
    return !error;
  };

  return { messages, ready, send, reload: load };
}

/** Quantas mensagens faltam ler no total. */
export function useNaoLidas(me: string | null) {
  const [total, setTotal] = useState(0);
  useEffect(() => {
    if (!me) return;
    const ler = async () => {
      const { data } = await supabase.rpc("nao_lidas");
      setTotal(Number(data ?? 0));
    };
    void ler();
    const ch = supabase
      .channel("dm-sino-" + me)
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, () => {
        void ler();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [me]);
  return total;
}
