-- Quem pode falar na tribo, e o anônimo do "Só entre nós".

-- 1. Quem fala: todo mundo, ou só quem criou (modo recado).
ALTER TABLE public.teias
  ADD COLUMN IF NOT EXISTS who_posts text NOT NULL DEFAULT 'todos' CHECK (who_posts IN ('todos','criadora'));

CREATE OR REPLACE FUNCTION public.pode_falar_na_tribo(_teia bigint, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teias t
    WHERE t.id = _teia
      AND public.is_teia_member(t.id::text, _user)
      AND (t.who_posts = 'todos' OR t.created_by = _user OR public.has_role(_user, 'admin'))
  )
$$;
REVOKE ALL ON FUNCTION public.pode_falar_na_tribo(bigint, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_falar_na_tribo(bigint, uuid) TO authenticated;

-- 2. Anônimo: a tribo não vê quem escreveu; o servidor e a moderação sempre sabem.
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS anonymous boolean NOT NULL DEFAULT false;
ALTER TABLE public.posts ADD CONSTRAINT posts_anon_so_secreto CHECK (NOT anonymous OR secret);

DROP POLICY IF EXISTS "Postar" ON public.posts;
CREATE POLICY "Postar" ON public.posts FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND status = 'publicado'
    AND (teia_id IS NULL OR public.pode_falar_na_tribo(teia_id, auth.uid()))
    AND (NOT secret OR (teia_id IS NOT NULL AND expires_at IS NOT NULL))
    AND (expires_at IS NULL OR expires_at <= now() + interval '30 days'));

-- Mensagem na conversa da tribo também respeita quem pode falar.
DROP POLICY IF EXISTS "Enviar mensagem nas minhas teias" ON public.teia_messages;
CREATE POLICY "Enviar mensagem nas minhas tribos" ON public.teia_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid()
    AND (teia_key ~ '^[0-9]+$' IS FALSE OR public.pode_falar_na_tribo(teia_key::bigint, auth.uid()))
    AND public.is_teia_member(teia_key, auth.uid())
    AND (body IS NOT NULL OR sticker IS NOT NULL)
    AND (body IS NULL OR length(body) BETWEEN 1 AND 1000)
    AND length(author) <= 40);

-- Leitura do "Só entre nós" sem revelar quem escreveu quando for anônimo.
CREATE OR REPLACE FUNCTION public.segredos_da_tribo(_teia bigint)
RETURNS TABLE (id uuid, body text, created_at timestamptz, expires_at timestamptz, anonymous boolean,
               author_id uuid, nickname text, avatar_url text, mine boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.body, p.created_at, p.expires_at, p.anonymous,
         CASE WHEN p.anonymous AND p.author_id <> auth.uid() THEN NULL ELSE p.author_id END,
         CASE WHEN p.anonymous AND p.author_id <> auth.uid() THEN 'Alguém da tribo' ELSE pr.nickname END,
         CASE WHEN p.anonymous AND p.author_id <> auth.uid() THEN '' ELSE pr.avatar_url END,
         p.author_id = auth.uid()
  FROM public.posts p JOIN public.profiles pr ON pr.id = p.author_id
  WHERE p.teia_id = _teia AND p.secret AND p.status = 'publicado'
    AND (p.expires_at IS NULL OR p.expires_at > now())
    AND auth.uid() IS NOT NULL
    AND public.is_teia_member(_teia::text, auth.uid())
    AND NOT public.is_blocked_between(auth.uid(), p.author_id)
  ORDER BY p.created_at DESC
  LIMIT 100
$$;
REVOKE ALL ON FUNCTION public.segredos_da_tribo(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.segredos_da_tribo(bigint) TO authenticated;

-- 3. A listagem passa a dizer quem pode falar.
DROP FUNCTION IF EXISTS public.list_teias(uuid, bigint);
CREATE FUNCTION public.list_teias(_creator uuid DEFAULT NULL, _id bigint DEFAULT NULL)
RETURNS TABLE (id bigint, kind text, name text, mode text, category text, city text, place text, when_text text,
               creator_nickname text, created_at timestamptz, starts_at timestamptz, capacity integer,
               going_count integer, i_am_going boolean, about text, rule text, official boolean,
               member_count integer, i_am_member boolean, cover_path text, audience text,
               who_posts text, i_can_post boolean, i_am_creator boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.kind, t.name, t.mode, t.category, t.city, t.place, t.when_text,
         CASE WHEN t.official THEN 'nommi' ELSE t.creator_nickname END,
         t.created_at, t.starts_at, t.capacity,
         (SELECT count(*)::int FROM public.teia_rsvps r WHERE r.teia_id = t.id),
         EXISTS (SELECT 1 FROM public.teia_rsvps r WHERE r.teia_id = t.id AND r.user_id = auth.uid()),
         t.about, t.rule, t.official,
         (SELECT count(*)::int FROM public.teia_members m WHERE m.teia_key = t.id::text),
         EXISTS (SELECT 1 FROM public.teia_members m WHERE m.teia_key = t.id::text AND m.user_id = auth.uid()),
         t.cover_path, t.audience, t.who_posts,
         public.pode_falar_na_tribo(t.id, auth.uid()),
         t.created_by = auth.uid()
  FROM public.teias t
  WHERE auth.uid() IS NOT NULL
    AND (t.official OR NOT public.is_blocked_between(auth.uid(), t.created_by))
    AND (_creator IS NULL OR t.created_by = _creator)
    AND (_id IS NULL OR t.id = _id)
  ORDER BY t.official DESC, t.created_at DESC
  LIMIT 200
$$;
REVOKE ALL ON FUNCTION public.list_teias(uuid, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_teias(uuid, bigint) TO authenticated;
