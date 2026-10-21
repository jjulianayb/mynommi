-- "Só entre nós": conteúdo que só quem está na tribo vê, e que some sozinho.
-- E tribos oficiais da nommi, abertas para qualquer pessoa entrar.

-- 1. Posts secretos da tribo
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS secret boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE public.posts ADD CONSTRAINT posts_secret_na_tribo CHECK (NOT secret OR teia_id IS NOT NULL);
CREATE INDEX posts_secret_idx ON public.posts (teia_id, secret, created_at DESC);

-- Post vencido some para todo mundo, inclusive para quem escreveu.
CREATE OR REPLACE FUNCTION public.can_view_post(_post uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = _post AND p.status = 'publicado'
      AND (p.expires_at IS NULL OR p.expires_at > now())
      AND NOT public.is_blocked_between(auth.uid(), p.author_id)
      AND (p.author_id = auth.uid()
        OR (p.teia_id IS NOT NULL AND public.is_teia_member(p.teia_id::text, auth.uid()))
        OR (p.teia_id IS NULL AND NOT p.secret AND (
              EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = auth.uid() AND f.followed_id = p.author_id)
           OR EXISTS (SELECT 1 FROM public.connections c WHERE c.status = 'aceita' AND ((c.requester_id = auth.uid() AND c.addressee_id = p.author_id) OR (c.addressee_id = auth.uid() AND c.requester_id = p.author_id)))))))
$$;

-- O que é secreto só nasce dentro de uma tribo, por quem está nela, e com prazo de no máximo 30 dias.
DROP POLICY IF EXISTS "Postar" ON public.posts;
CREATE POLICY "Postar" ON public.posts FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND status = 'publicado'
    AND (teia_id IS NULL OR public.is_teia_member(teia_id::text, auth.uid()))
    AND (NOT secret OR (teia_id IS NOT NULL AND expires_at IS NOT NULL))
    AND (expires_at IS NULL OR expires_at <= now() + interval '30 days'));

-- O autor não vê mais o próprio post vencido na listagem direta.
DROP POLICY IF EXISTS "Ver posts que posso ver" ON public.posts;
CREATE POLICY "Ver posts que posso ver" ON public.posts FOR SELECT TO authenticated
  USING ((author_id = auth.uid() AND (expires_at IS NULL OR expires_at > now())) OR public.can_view_post(id));

-- 2. Tribos oficiais e descrição
ALTER TABLE public.teias
  ADD COLUMN IF NOT EXISTS about text NOT NULL DEFAULT '' CHECK (char_length(about) <= 280),
  ADD COLUMN IF NOT EXISTS official boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rule text NOT NULL DEFAULT '' CHECK (char_length(rule) <= 140);

-- Ninguém se declara oficial: só a administração marca.
CREATE OR REPLACE FUNCTION public.teias_oficial_so_admin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- auth.uid() nulo = acesso de servidor (service_role), que é confiável.
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.official AND NOT public.has_role(auth.uid(), 'admin') THEN NEW.official := false; END IF;
  ELSE
    IF NEW.official IS DISTINCT FROM OLD.official AND NOT public.has_role(auth.uid(), 'admin') THEN NEW.official := OLD.official; END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.teias_oficial_so_admin() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER teias_oficial BEFORE INSERT OR UPDATE ON public.teias FOR EACH ROW EXECUTE FUNCTION public.teias_oficial_so_admin();

-- Admin cuida das tribos oficiais.
CREATE POLICY "Admin edita tribos" ON public.teias FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Listagem passa a trazer descrição, regra, se é oficial e quantas pessoas já entraram
DROP FUNCTION IF EXISTS public.list_teias(uuid, bigint);
CREATE FUNCTION public.list_teias(_creator uuid DEFAULT NULL, _id bigint DEFAULT NULL)
RETURNS TABLE (id bigint, kind text, name text, mode text, category text, city text, place text, when_text text,
               creator_nickname text, created_at timestamptz, starts_at timestamptz, capacity integer,
               going_count integer, i_am_going boolean, about text, rule text, official boolean,
               member_count integer, i_am_member boolean, cover_path text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.kind, t.name, t.mode, t.category, t.city, t.place, t.when_text,
         CASE WHEN t.official THEN 'nommi' ELSE t.creator_nickname END,
         t.created_at, t.starts_at, t.capacity,
         (SELECT count(*)::int FROM public.teia_rsvps r WHERE r.teia_id = t.id),
         EXISTS (SELECT 1 FROM public.teia_rsvps r WHERE r.teia_id = t.id AND r.user_id = auth.uid()),
         t.about, t.rule, t.official,
         (SELECT count(*)::int FROM public.teia_members m WHERE m.teia_key = t.id::text),
         EXISTS (SELECT 1 FROM public.teia_members m WHERE m.teia_key = t.id::text AND m.user_id = auth.uid()),
         t.cover_path
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
