-- A página pessoal: o que faz alguém entender quem você é antes de se conectar.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS places text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS instagram text NOT NULL DEFAULT '' CHECK (char_length(instagram) <= 40),
  ADD COLUMN IF NOT EXISTS looking_for text NOT NULL DEFAULT '' CHECK (char_length(looking_for) <= 140),
  ADD COLUMN IF NOT EXISTS person_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_places_limit CHECK (cardinality(places) <= 8);

-- Ninguém se dá o selo de pessoa verificada: isso só vem de fora, por quem confere.
-- Permissão por coluna: a de tabela inteira cobriria todas, inclusive person_verified.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (nickname, city, interests, about, profile_mode, avatar_url, goals, visibility,
              wall_approval, show_counts, cover_path, background_path, places, instagram,
              looking_for, is_business, updated_at) ON public.profiles TO authenticated;

-- Página pública, num só pedido: perfil, números e tribos em comum.
CREATE OR REPLACE FUNCTION public.pagina_pessoal(_user uuid)
RETURNS TABLE (id uuid, nickname text, city text, about text, interests text[], places text[],
               looking_for text, instagram text, avatar_url text, cover_path text, background_path text,
               person_verified boolean, profile_mode text,
               tribos_em_comum text[], desde timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.nickname, p.city, p.about, p.interests, p.places,
         p.looking_for, p.instagram, p.avatar_url, p.cover_path, p.background_path,
         p.person_verified, p.profile_mode,
         COALESCE((
           SELECT array_agg(DISTINCT t.name)
           FROM public.teia_members m
           JOIN public.teias t ON t.id::text = m.teia_key
           WHERE m.user_id = p.id
             AND EXISTS (SELECT 1 FROM public.teia_members eu WHERE eu.teia_key = m.teia_key AND eu.user_id = auth.uid())
         ), '{}'),
         p.created_at
  FROM public.profiles p
  WHERE p.id = _user AND auth.uid() IS NOT NULL
    AND NOT public.is_blocked_between(auth.uid(), p.id)
    AND (p.id = auth.uid() OR p.profile_mode = 'publico')
$$;
REVOKE ALL ON FUNCTION public.pagina_pessoal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pagina_pessoal(uuid) TO authenticated;
