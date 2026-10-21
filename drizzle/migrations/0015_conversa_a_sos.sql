-- Conversa a sós entre contas reais: só entre amizades aceitas, nunca com quem bloqueou.

CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  body text CHECK (body IS NULL OR char_length(body) BETWEEN 1 AND 1000),
  sticker integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CHECK (sender_id <> recipient_id),
  CHECK (body IS NOT NULL OR sticker IS NOT NULL)
);
CREATE INDEX direct_messages_par_idx ON public.direct_messages (LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), created_at DESC);
CREATE INDEX direct_messages_nao_lidas_idx ON public.direct_messages (recipient_id, read_at);
GRANT SELECT, INSERT ON public.direct_messages TO authenticated;
GRANT UPDATE (read_at) ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Só conversa quem já é amizade aceita e não está bloqueado.
CREATE OR REPLACE FUNCTION public.sao_amigos(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.connections c
    WHERE c.status = 'aceita'
      AND ((c.requester_id = _a AND c.addressee_id = _b) OR (c.addressee_id = _a AND c.requester_id = _b))
  ) AND NOT public.is_blocked_between(_a, _b)
$$;
REVOKE ALL ON FUNCTION public.sao_amigos(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sao_amigos(uuid, uuid) TO authenticated;

CREATE POLICY "Ver as minhas conversas" ON public.direct_messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY "Mandar mensagem para uma amizade" ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.sao_amigos(sender_id, recipient_id) AND read_at IS NULL);
CREATE POLICY "Marcar como lida o que recebi" ON public.direct_messages FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;

-- Lista de conversas: uma linha por amizade, com a última mensagem e quantas faltam ler.
CREATE OR REPLACE FUNCTION public.minhas_conversas()
RETURNS TABLE (outro_id uuid, nickname text, avatar_url text, ultima text, ultima_sticker integer, ultima_minha boolean, ultima_em timestamptz, nao_lidas integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH amigos AS (
    SELECT CASE WHEN c.requester_id = auth.uid() THEN c.addressee_id ELSE c.requester_id END AS outro
    FROM public.connections c
    WHERE auth.uid() IS NOT NULL AND c.status = 'aceita'
      AND (c.requester_id = auth.uid() OR c.addressee_id = auth.uid())
      AND NOT public.is_blocked_between(auth.uid(), CASE WHEN c.requester_id = auth.uid() THEN c.addressee_id ELSE c.requester_id END)
  )
  SELECT a.outro, p.nickname, p.avatar_url, m.body, m.sticker, m.sender_id = auth.uid(), m.created_at,
         (SELECT count(*)::int FROM public.direct_messages n
           WHERE n.sender_id = a.outro AND n.recipient_id = auth.uid() AND n.read_at IS NULL)
  FROM amigos a
  JOIN public.profiles p ON p.id = a.outro
  LEFT JOIN LATERAL (
    SELECT d.body, d.sticker, d.sender_id, d.created_at
    FROM public.direct_messages d
    WHERE (d.sender_id = auth.uid() AND d.recipient_id = a.outro)
       OR (d.sender_id = a.outro AND d.recipient_id = auth.uid())
    ORDER BY d.created_at DESC LIMIT 1
  ) m ON true
  ORDER BY m.created_at DESC NULLS LAST, p.nickname
  LIMIT 200
$$;
REVOKE ALL ON FUNCTION public.minhas_conversas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.minhas_conversas() TO authenticated;

-- Quantas mensagens faltam ler no total (para o sino).
CREATE OR REPLACE FUNCTION public.nao_lidas()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.direct_messages
  WHERE recipient_id = auth.uid() AND read_at IS NULL AND auth.uid() IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.nao_lidas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nao_lidas() TO authenticated;
