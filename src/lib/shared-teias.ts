import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Message } from './friends-data';

type Row = { id: string; teia_key: string; sender_id: string; author: string; body: string | null; sticker: number | null; created_at: string };
type Member = { user_id: string; nickname: string };

/** Map a server message row to the chat Message shape for the current viewer. */
export function toMessage(row: Row, me: string): Message {
  const time = new Date(row.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return { ...(row.body != null ? { text: row.body } : {}), ...(row.sticker != null ? { sticker: row.sticker } : {}), mine: row.sender_id === me, ...(row.sender_id === me ? {} : { author: row.author || 'nommi' }), time };
}

/** Real cross-account teia: membership + messages stored in Lovable Cloud with live updates. */
export function useSharedTeia(teiaId: number, userId: string | null, nickname: string) {
  const key = String(teiaId);
  const [rows, setRows] = useState<Row[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [ready, setReady] = useState(false);
  const joined = !!userId && members.some((m) => m.user_id === userId);

  const loadMembers = useCallback(async () => {
    const { data } = await supabase.from('teia_members').select('user_id,nickname').eq('teia_key', key);
    setMembers(data ?? []);
  }, [key]);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      await loadMembers();
      const { data } = await supabase.from('teia_messages').select('*').eq('teia_key', key).order('created_at').limit(200);
      if (alive) { setRows((data as Row[]) ?? []); setReady(true); }
    })();
    const channel = supabase.channel('teia-' + key)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'teia_messages', filter: 'teia_key=eq.' + key }, (p) => {
        const r = p.new as Row; setRows((prev) => (prev.some((x) => x.id === r.id) ? prev : [...prev, r]));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teia_members', filter: 'teia_key=eq.' + key }, () => { void loadMembers(); })
      .subscribe();
    return () => { alive = false; void supabase.removeChannel(channel); };
  }, [key, userId, loadMembers]);

  // Reload messages once membership is granted (RLS hides them before joining).
  useEffect(() => {
    if (!joined) return;
    void supabase.from('teia_messages').select('*').eq('teia_key', key).order('created_at').limit(200).then(({ data }) => setRows((data as Row[]) ?? []));
  }, [joined, key]);

  async function join() {
    if (!userId) return false;
    const { error } = await supabase.from('teia_members').upsert({ teia_key: key, user_id: userId, nickname: nickname.slice(0, 40) });
    await loadMembers();
    return !error;
  }
  async function leave() {
    if (!userId) return;
    await supabase.from('teia_members').delete().eq('teia_key', key).eq('user_id', userId);
    setRows([]); await loadMembers();
  }
  async function send(m: Message) {
    if (!userId || (!m.text && m.sticker === undefined)) return false;
    const { data, error } = await supabase.from('teia_messages')
      .insert({ teia_key: key, sender_id: userId, author: nickname.slice(0, 40), body: m.text?.slice(0, 1000) ?? null, sticker: m.sticker ?? null })
      .select().single();
    if (data) setRows((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data as Row]));
    return !error;
  }

  return { ready, joined, members, messages: userId ? rows.map((r) => toMessage(r, userId)) : [], join, leave, send };
}
