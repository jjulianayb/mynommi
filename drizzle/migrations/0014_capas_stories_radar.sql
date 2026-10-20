-- Capas e fundos, stories, figurinhas salvas, radar global e contas de teste.

-- 1. Capas e planos de fundo (caminhos no armazenamento, ou vazio = padrão da nommi).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cover_path text NOT NULL DEFAULT '' CHECK (char_length(cover_path) <= 200),
  ADD COLUMN IF NOT EXISTS background_path text NOT NULL DEFAULT '' CHECK (char_length(background_path) <= 200),
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.teias
  ADD COLUMN IF NOT EXISTS cover_path text NOT NULL DEFAULT '' CHECK (char_length(cover_path) <= 200),
  ADD COLUMN IF NOT EXISTS background_path text NOT NULL DEFAULT '' CHECK (char_length(background_path) <= 200);

INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Ver capas" ON storage.objects FOR SELECT TO authenticated, anon USING (bucket_id = 'covers');
CREATE POLICY "Enviar a própria capa" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Trocar a própria capa" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Apagar a própria capa" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 2. Stories: foto ou vídeo que some em 24 horas.
CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('foto','video')),
  path text NOT NULL CHECK (char_length(path) BETWEEN 5 AND 200),
  caption text NOT NULL DEFAULT '' CHECK (char_length(caption) <= 140),
  audience text NOT NULL DEFAULT 'todos' CHECK (audience IN ('todos','amizades')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours'
);
CREATE INDEX stories_live_idx ON public.stories (author_id, expires_at DESC);
GRANT SELECT, INSERT, DELETE ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_view_story(_author uuid, _audience text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND NOT public.is_blocked_between(auth.uid(), _author)
    AND (_author = auth.uid()
      OR EXISTS (SELECT 1 FROM public.connections c WHERE c.status = 'aceita'
            AND ((c.requester_id = auth.uid() AND c.addressee_id = _author) OR (c.addressee_id = auth.uid() AND c.requester_id = _author)))
      OR (_audience = 'todos' AND EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = auth.uid() AND f.followed_id = _author)))
$$;
REVOKE ALL ON FUNCTION public.can_view_story(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_story(uuid, text) TO authenticated;

CREATE POLICY "Ver stories no ar" ON public.stories FOR SELECT TO authenticated
  USING (expires_at > now() AND public.can_view_story(author_id, audience));
CREATE POLICY "Publicar story" ON public.stories FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND path LIKE auth.uid()::text || '/%' AND expires_at <= now() + interval '24 hours');
CREATE POLICY "Apagar meu story" ON public.stories FOR DELETE TO authenticated USING (author_id = auth.uid());

CREATE TABLE public.story_views (
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL,
  seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, viewer_id)
);
GRANT SELECT, INSERT ON public.story_views TO authenticated;
GRANT ALL ON public.story_views TO service_role;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autor vê quem viu; eu vejo o meu" ON public.story_views FOR SELECT TO authenticated
  USING (viewer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.author_id = auth.uid()));
CREATE POLICY "Marcar como visto" ON public.story_views FOR INSERT TO authenticated
  WITH CHECK (viewer_id = auth.uid() AND EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_id AND s.expires_at > now() AND public.can_view_story(s.author_id, s.audience)));

INSERT INTO storage.buckets (id, name, public) VALUES ('stories', 'stories', false) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Enviar meu story" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'stories' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Apagar meu arquivo de story" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'stories' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Ver arquivo de story permitido" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'stories' AND ((storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.stories s WHERE s.path = name AND s.expires_at > now() AND public.can_view_story(s.author_id, s.audience))));

-- Limpeza: quem apaga o story some da lista; os arquivos vencidos saem numa rotina futura.
CREATE OR REPLACE FUNCTION public.purge_expired_stories()
RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH apagados AS (DELETE FROM public.stories WHERE expires_at < now() - interval '2 days' RETURNING 1)
  SELECT count(*)::int FROM apagados
$$;
REVOKE ALL ON FUNCTION public.purge_expired_stories() FROM PUBLIC, anon, authenticated;

-- 3. Figurinhas salvas na conta (antes só ficavam no aparelho).
CREATE TABLE public.saved_stickers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL CHECK (source IN ('nommi','minha')),
  sticker_id integer,
  path text CHECK (path IS NULL OR char_length(path) BETWEEN 5 AND 200),
  caption text NOT NULL DEFAULT '' CHECK (char_length(caption) <= 40),
  tags text[] NOT NULL DEFAULT '{}' CHECK (cardinality(tags) <= 8),
  favorite boolean NOT NULL DEFAULT false,
  used_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sticker_id IS NOT NULL OR path IS NOT NULL)
);
CREATE INDEX saved_stickers_user_idx ON public.saved_stickers (user_id, favorite DESC, used_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_stickers TO authenticated;
GRANT ALL ON public.saved_stickers TO service_role;
ALTER TABLE public.saved_stickers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Minhas figurinhas" ON public.saved_stickers FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Salvar figurinha" ON public.saved_stickers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND (path IS NULL OR path LIKE auth.uid()::text || '/%'));
CREATE POLICY "Editar minha figurinha" ON public.saved_stickers FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Apagar minha figurinha" ON public.saved_stickers FOR DELETE TO authenticated USING (user_id = auth.uid());

INSERT INTO storage.buckets (id, name, public) VALUES ('stickers', 'stickers', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Ver figurinhas" ON storage.objects FOR SELECT TO authenticated, anon USING (bucket_id = 'stickers');
CREATE POLICY "Enviar minha figurinha" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'stickers' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Apagar meu arquivo de figurinha" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'stickers' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Radar nommi em qualquer lugar: posição aproximada, com validade curta.
ALTER TABLE public.radar_presence
  ADD COLUMN IF NOT EXISTS lat numeric(6,3),
  ADD COLUMN IF NOT EXISTS lng numeric(6,3),
  ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT '' CHECK (char_length(city) <= 80);
ALTER TABLE public.radar_presence ADD CONSTRAINT radar_lat_range CHECK (lat IS NULL OR (lat BETWEEN -90 AND 90));
ALTER TABLE public.radar_presence ADD CONSTRAINT radar_lng_range CHECK (lng IS NULL OR (lng BETWEEN -180 AND 180));

-- Lista quem está com o radar ligado por perto. Devolve distância aproximada, nunca a posição do outro.
CREATE OR REPLACE FUNCTION public.radar_nearby(_lat numeric, _lng numeric, _km numeric DEFAULT 10)
RETURNS TABLE (user_id uuid, nickname text, avatar_url text, place_name text, area text, activity text, city text, km numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.user_id, p.nickname, p.avatar_url, r.place_name, r.area, r.activity, r.city,
         round((6371 * acos(least(1, greatest(-1,
           cos(radians(_lat)) * cos(radians(r.lat)) * cos(radians(r.lng) - radians(_lng))
           + sin(radians(_lat)) * sin(radians(r.lat))))))::numeric, 1)
  FROM public.radar_presence r
  JOIN public.profiles p ON p.id = r.user_id
  WHERE auth.uid() IS NOT NULL
    AND r.user_id <> auth.uid()
    AND r.until > now()
    AND r.lat IS NOT NULL AND r.lng IS NOT NULL
    AND p.profile_mode = 'publico'
    AND NOT public.is_blocked_between(auth.uid(), r.user_id)
    AND (6371 * acos(least(1, greatest(-1,
          cos(radians(_lat)) * cos(radians(r.lat)) * cos(radians(r.lng) - radians(_lng))
          + sin(radians(_lat)) * sin(radians(r.lat)))))) <= least(greatest(_km, 1), 50)
  ORDER BY 8
  LIMIT 50
$$;
REVOKE ALL ON FUNCTION public.radar_nearby(numeric, numeric, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.radar_nearby(numeric, numeric, numeric) TO authenticated;
