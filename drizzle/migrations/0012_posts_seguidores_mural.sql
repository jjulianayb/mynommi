-- Parte 1b: posts, reações, comentários, mídia, seguidores e o mural "Meus amigos dizem".

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_counts boolean NOT NULL DEFAULT true;

-- Seguidores (um sentido; só de perfis públicos; bloqueio impede).
CREATE TABLE public.follows (
  follower_id uuid NOT NULL,
  followed_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followed_id),
  CHECK (follower_id <> followed_id)
);
CREATE INDEX follows_followed_idx ON public.follows (followed_id);
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver meus vínculos de seguir" ON public.follows FOR SELECT TO authenticated USING (follower_id = auth.uid() OR followed_id = auth.uid());
CREATE POLICY "Seguir perfil público" ON public.follows FOR INSERT TO authenticated
  WITH CHECK (follower_id = auth.uid() AND NOT public.is_blocked_between(follower_id, followed_id)
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = followed_id AND p.profile_mode = 'publico' AND NOT p.is_business));
CREATE POLICY "Deixar de seguir" ON public.follows FOR DELETE TO authenticated USING (follower_id = auth.uid());

-- Posts
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  teia_id bigint REFERENCES public.teias(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  location text NOT NULL DEFAULT '' CHECK (char_length(location) <= 80),
  status text NOT NULL DEFAULT 'publicado' CHECK (status IN ('publicado','removido')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX posts_teia_idx ON public.posts (teia_id, created_at DESC);
CREATE INDEX posts_author_idx ON public.posts (author_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.posts TO authenticated;
GRANT UPDATE (body, location, status) ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Quem vê um post: o autor; os membros da Teia (se for post de Teia); seguidores e conexões (se for post solto de perfil público).
CREATE OR REPLACE FUNCTION public.can_view_post(_post uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = _post AND p.status = 'publicado' AND NOT public.is_blocked_between(auth.uid(), p.author_id)
      AND (p.author_id = auth.uid()
        OR (p.teia_id IS NOT NULL AND public.is_teia_member(p.teia_id::text, auth.uid()))
        OR (p.teia_id IS NULL AND (
              EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = auth.uid() AND f.followed_id = p.author_id)
           OR EXISTS (SELECT 1 FROM public.connections c WHERE c.status = 'aceita' AND ((c.requester_id = auth.uid() AND c.addressee_id = p.author_id) OR (c.addressee_id = auth.uid() AND c.requester_id = p.author_id)))))))
$$;
REVOKE ALL ON FUNCTION public.can_view_post(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_post(uuid) TO authenticated;

-- Números do perfil: o dono vê tudo; os outros só veem se a pessoa deixou as contagens visíveis.
CREATE OR REPLACE FUNCTION public.profile_stats(_user uuid)
RETURNS TABLE (followers integer, following integer, connections integer, teias integer, posts integer, visible boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (
    SELECT (_user = auth.uid() OR (p.show_counts AND p.profile_mode = 'publico' AND NOT public.is_blocked_between(auth.uid(), _user))) AS ok
    FROM public.profiles p WHERE p.id = _user
  )
  SELECT CASE WHEN me.ok THEN (SELECT count(*)::int FROM public.follows WHERE followed_id = _user) END,
         CASE WHEN me.ok THEN (SELECT count(*)::int FROM public.follows WHERE follower_id = _user) END,
         CASE WHEN me.ok THEN (SELECT count(*)::int FROM public.connections WHERE status = 'aceita' AND (requester_id = _user OR addressee_id = _user)) END,
         CASE WHEN me.ok THEN (SELECT count(*)::int FROM public.teia_members WHERE user_id = _user AND teia_key ~ '^[0-9]+$' AND EXISTS (SELECT 1 FROM public.teias t WHERE t.id = teia_key::bigint AND t.kind = 'teia')) END,
         CASE WHEN me.ok THEN (SELECT count(*)::int FROM public.posts WHERE author_id = _user AND status = 'publicado') END,
         me.ok
  FROM me WHERE auth.uid() IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.profile_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.profile_stats(uuid) TO authenticated;

CREATE POLICY "Ver posts que posso ver" ON public.posts FOR SELECT TO authenticated USING (author_id = auth.uid() OR public.can_view_post(id));
CREATE POLICY "Postar" ON public.posts FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND status = 'publicado'
    AND (teia_id IS NULL OR public.is_teia_member(teia_id::text, auth.uid())));
CREATE POLICY "Editar meu post" ON public.posts FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid() AND status = 'publicado');
CREATE POLICY "Apagar meu post" ON public.posts FOR DELETE TO authenticated USING (author_id = auth.uid());
CREATE POLICY "Admin modera posts" ON public.posts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin vê posts" ON public.posts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fotos e vídeos do post (arquivos num bucket privado; o caminho começa pelo id de quem enviou).
CREATE TABLE public.post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('foto','video')),
  path text NOT NULL CHECK (char_length(path) BETWEEN 5 AND 200),
  position integer NOT NULL DEFAULT 0 CHECK (position BETWEEN 0 AND 3),
  UNIQUE (post_id, position)
);
GRANT SELECT, INSERT, DELETE ON public.post_media TO authenticated;
GRANT ALL ON public.post_media TO service_role;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver mídia de post visível" ON public.post_media FOR SELECT TO authenticated USING (public.can_view_post(post_id) OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = auth.uid()));
CREATE POLICY "Anexar mídia ao meu post" ON public.post_media FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = auth.uid()) AND path LIKE auth.uid()::text || '/%');
CREATE POLICY "Remover mídia do meu post" ON public.post_media FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = auth.uid()));

INSERT INTO storage.buckets (id, name, public) VALUES ('post-media', 'post-media', false) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Enviar mídia de post" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Apagar minha mídia de post" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'post-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Ver mídia de post permitido" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'post-media' AND ((storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.post_media m WHERE m.path = name AND public.can_view_post(m.post_id))));

-- Reações e comentários
CREATE TABLE public.post_reactions (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'curtir' CHECK (kind IN ('curtir','apoiar','rir')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_reactions TO authenticated;
GRANT ALL ON public.post_reactions TO service_role;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver reações de post visível" ON public.post_reactions FOR SELECT TO authenticated USING (public.can_view_post(post_id));
CREATE POLICY "Reagir" ON public.post_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.can_view_post(post_id));
CREATE POLICY "Trocar minha reação" ON public.post_reactions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Tirar minha reação" ON public.post_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author text NOT NULL DEFAULT '' CHECK (char_length(author) <= 40),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX post_comments_post_idx ON public.post_comments (post_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver comentários de post visível" ON public.post_comments FOR SELECT TO authenticated USING (public.can_view_post(post_id));
CREATE POLICY "Comentar" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() AND public.can_view_post(post_id));
CREATE POLICY "Apagar meu comentário ou de post meu" ON public.post_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = auth.uid()));
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;

-- Mural "Meus amigos dizem": frase ou figurinha de uma conexão sobre a pessoa; a pessoa aprova se quiser.
CREATE TABLE public.wall_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id uuid NOT NULL,
  author_id uuid NOT NULL,
  author text NOT NULL DEFAULT '' CHECK (char_length(author) <= 40),
  body text CHECK (body IS NULL OR char_length(body) BETWEEN 1 AND 140),
  sticker integer,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (author_id <> target_id),
  CHECK (body IS NOT NULL OR sticker IS NOT NULL)
);
CREATE INDEX wall_items_target_idx ON public.wall_items (target_id, status, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wall_items TO authenticated;
GRANT ALL ON public.wall_items TO service_role;
ALTER TABLE public.wall_items ENABLE ROW LEVEL SECURITY;

-- O status nasce no servidor: ninguém se aprova sozinho.
CREATE OR REPLACE FUNCTION public.wall_items_set_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.status := CASE WHEN (SELECT wall_approval FROM public.profiles WHERE id = NEW.target_id) IS FALSE THEN 'aprovado' ELSE 'pendente' END;
  ELSE
    NEW.target_id := OLD.target_id; NEW.author_id := OLD.author_id; NEW.author := OLD.author; NEW.body := OLD.body; NEW.sticker := OLD.sticker; NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.wall_items_set_status() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER wall_items_status BEFORE INSERT OR UPDATE ON public.wall_items FOR EACH ROW EXECUTE FUNCTION public.wall_items_set_status();

CREATE POLICY "Ver mural aprovado ou o meu" ON public.wall_items FOR SELECT TO authenticated
  USING (target_id = auth.uid() OR author_id = auth.uid()
     OR (status = 'aprovado' AND NOT public.is_blocked_between(auth.uid(), target_id)
         AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = target_id AND p.profile_mode = 'publico')));
CREATE POLICY "Escrever no mural de uma conexão" ON public.wall_items FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND NOT public.is_blocked_between(author_id, target_id)
    AND EXISTS (SELECT 1 FROM public.connections c WHERE c.status = 'aceita' AND ((c.requester_id = author_id AND c.addressee_id = target_id) OR (c.addressee_id = author_id AND c.requester_id = target_id))));
CREATE POLICY "Aprovar no meu mural" ON public.wall_items FOR UPDATE TO authenticated USING (target_id = auth.uid()) WITH CHECK (target_id = auth.uid());
CREATE POLICY "Apagar do mural" ON public.wall_items FOR DELETE TO authenticated USING (target_id = auth.uid() OR author_id = auth.uid());
