-- Figurinha criada no app vira mensagem de verdade. A imagem sobe no bucket
-- público "stickers" (criado na 0014) e a mensagem guarda o caminho e a
-- legenda escrita na hora. Idempotente: pode rodar mais de uma vez.

ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS sticker_path text
  CHECK (sticker_path IS NULL OR char_length(sticker_path) <= 200);
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS sticker_legenda text
  CHECK (sticker_legenda IS NULL OR char_length(sticker_legenda) <= 160);

-- A regra "toda mensagem tem conteúdo" passa a aceitar a figurinha criada.
DO $trocar$
DECLARE c record;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.direct_messages'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%body IS NOT NULL%' LOOP
    EXECUTE format('ALTER TABLE public.direct_messages DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $trocar$;
DO $add$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.direct_messages'::regclass AND conname = 'direct_messages_tem_conteudo') THEN
    ALTER TABLE public.direct_messages ADD CONSTRAINT direct_messages_tem_conteudo
      CHECK (body IS NOT NULL OR sticker IS NOT NULL OR sticker_path IS NOT NULL);
  END IF;
END $add$;

ALTER TABLE public.teia_messages ADD COLUMN IF NOT EXISTS sticker_path text
  CHECK (sticker_path IS NULL OR char_length(sticker_path) <= 200);
ALTER TABLE public.teia_messages ADD COLUMN IF NOT EXISTS sticker_legenda text
  CHECK (sticker_legenda IS NULL OR char_length(sticker_legenda) <= 160);

DROP POLICY IF EXISTS "Enviar mensagem nas minhas teias" ON public.teia_messages;
CREATE POLICY "Enviar mensagem nas minhas teias" ON public.teia_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_teia_member(teia_key, auth.uid())
    AND (body IS NOT NULL OR sticker IS NOT NULL OR sticker_path IS NOT NULL)
    AND (body IS NULL OR length(body) BETWEEN 1 AND 1000)
    AND length(author) <= 40);

DROP POLICY IF EXISTS "Enviar mensagem nas minhas tribos" ON public.teia_messages;
CREATE POLICY "Enviar mensagem nas minhas tribos" ON public.teia_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid()
    AND ((teia_key ~ '^[0-9]+$') IS FALSE OR public.pode_falar_na_tribo(teia_key::bigint, auth.uid()))
    AND public.is_teia_member(teia_key, auth.uid())
    AND (body IS NOT NULL OR sticker IS NOT NULL OR sticker_path IS NOT NULL)
    AND (body IS NULL OR length(body) BETWEEN 1 AND 1000)
    AND length(author) <= 40);

-- A lista de conversas mostra "Figurinha" também quando a última foi criada no app.
-- A função viva já tinha tribos_juntas (aplicada fora do repo); preservada aqui.
DROP FUNCTION public.minhas_conversas();
CREATE FUNCTION public.minhas_conversas()
RETURNS TABLE (outro_id uuid, nickname text, avatar_url text, ultima text, ultima_sticker integer, ultima_minha boolean, ultima_em timestamptz, nao_lidas integer, tribos_juntas integer)
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
           WHERE n.sender_id = a.outro AND n.recipient_id = auth.uid() AND n.read_at IS NULL),
         (SELECT count(*)::int FROM public.teia_members x
           JOIN public.teia_members y ON y.teia_key = x.teia_key AND y.user_id = a.outro
           WHERE x.user_id = auth.uid())
  FROM amigos a
  JOIN public.profiles p ON p.id = a.outro
  LEFT JOIN LATERAL (
    SELECT coalesce(d.body, CASE WHEN d.sticker_path IS NOT NULL THEN 'Figurinha' END) AS body,
           d.sticker, d.sender_id, d.created_at
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
