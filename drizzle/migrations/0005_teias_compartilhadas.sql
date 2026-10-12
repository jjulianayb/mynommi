CREATE TABLE public.teia_members (
  teia_key text NOT NULL,
  user_id uuid NOT NULL,
  nickname text NOT NULL DEFAULT '',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (teia_key, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teia_members TO authenticated;
GRANT ALL ON public.teia_members TO service_role;
ALTER TABLE public.teia_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_teia_member(_teia text, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.teia_members WHERE teia_key = _teia AND user_id = _user)
$$;

CREATE POLICY "Ver membros das minhas teias" ON public.teia_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_teia_member(teia_key, auth.uid()));
CREATE POLICY "Entrar numa teia" ON public.teia_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND length(teia_key) <= 40 AND length(nickname) <= 40);
CREATE POLICY "Atualizar meu apelido na teia" ON public.teia_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND length(nickname) <= 40);
CREATE POLICY "Sair da teia" ON public.teia_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.teia_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teia_key text NOT NULL,
  sender_id uuid NOT NULL,
  author text NOT NULL DEFAULT '',
  body text,
  sticker integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX teia_messages_teia_idx ON public.teia_messages (teia_key, created_at);
GRANT SELECT, INSERT, DELETE ON public.teia_messages TO authenticated;
GRANT ALL ON public.teia_messages TO service_role;
ALTER TABLE public.teia_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ler mensagens das minhas teias" ON public.teia_messages FOR SELECT TO authenticated
  USING (public.is_teia_member(teia_key, auth.uid()));
CREATE POLICY "Enviar mensagem nas minhas teias" ON public.teia_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_teia_member(teia_key, auth.uid())
    AND (body IS NOT NULL OR sticker IS NOT NULL)
    AND (body IS NULL OR length(body) BETWEEN 1 AND 1000)
    AND length(author) <= 40);
CREATE POLICY "Apagar a própria mensagem" ON public.teia_messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.teia_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teia_members;