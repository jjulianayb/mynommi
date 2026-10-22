-- Enquadramento da foto e da capa. Guardamos dois números de 0 a 100, não um texto de CSS:
-- o que vai para dentro de uma regra de estilo precisa ser número, não frase.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cover_x smallint NOT NULL DEFAULT 50 CHECK (cover_x BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS cover_y smallint NOT NULL DEFAULT 50 CHECK (cover_y BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS avatar_x smallint NOT NULL DEFAULT 50 CHECK (avatar_x BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS avatar_y smallint NOT NULL DEFAULT 50 CHECK (avatar_y BETWEEN 0 AND 100);

ALTER TABLE public.teias
  ADD COLUMN IF NOT EXISTS cover_x smallint NOT NULL DEFAULT 50 CHECK (cover_x BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS cover_y smallint NOT NULL DEFAULT 50 CHECK (cover_y BETWEEN 0 AND 100);

-- Permissão por coluna de novo: a de tabela inteira abriria person_verified junto.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (nickname, city, interests, about, profile_mode, avatar_url, goals, visibility,
              wall_approval, show_counts, cover_path, background_path, places, instagram,
              looking_for, is_business, updated_at,
              cover_x, cover_y, avatar_x, avatar_y) ON public.profiles TO authenticated;

DROP FUNCTION IF EXISTS public.pagina_pessoal(uuid);
CREATE FUNCTION public.pagina_pessoal(_user uuid)
RETURNS TABLE (id uuid, nickname text, city text, about text, interests text[], places text[],
               looking_for text, instagram text, avatar_url text, cover_path text, background_path text,
               person_verified boolean, profile_mode text,
               tribos_em_comum text[], desde timestamptz,
               cover_x smallint, cover_y smallint, avatar_x smallint, avatar_y smallint)
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
         p.created_at,
         p.cover_x, p.cover_y, p.avatar_x, p.avatar_y
  FROM public.profiles p
  WHERE p.id = _user AND auth.uid() IS NOT NULL
    AND NOT public.is_blocked_between(auth.uid(), p.id)
    AND (p.id = auth.uid() OR p.profile_mode = 'publico')
$$;
REVOKE ALL ON FUNCTION public.pagina_pessoal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pagina_pessoal(uuid) TO authenticated;

-- O baralho também respeita o enquadramento: a pessoa escolheu como quer ser vista.
DROP FUNCTION IF EXISTS public.pessoas_para_combinar(integer);
CREATE FUNCTION public.pessoas_para_combinar(_limite integer DEFAULT 20)
RETURNS TABLE (
  user_id uuid, nickname text, avatar_url text, cover_path text, city text, about text,
  interests text[], goals text[], places text[], looking_for text, person_verified boolean,
  em_comum text[], afinidade integer, mesma_cidade boolean, ja_me_curtiu boolean,
  cover_x smallint, cover_y smallint, avatar_x smallint, avatar_y smallint
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH eu AS (SELECT id, interests, goals, city FROM public.profiles WHERE id = auth.uid())
  SELECT p.id, p.nickname, p.avatar_url, p.cover_path, p.city, p.about,
         p.interests, p.goals, p.places, p.looking_for, p.person_verified,
         ARRAY(SELECT unnest(p.interests) INTERSECT SELECT unnest(e.interests)),
         (cardinality(ARRAY(SELECT unnest(p.interests) INTERSECT SELECT unnest(e.interests))) * 2
          + cardinality(ARRAY(SELECT unnest(p.goals) INTERSECT SELECT unnest(e.goals)))
          + CASE WHEN p.city = e.city AND p.city <> '' THEN 1 ELSE 0 END)::int,
         (p.city = e.city AND p.city <> ''),
         EXISTS (SELECT 1 FROM public.curtidas c WHERE c.de = p.id AND c.para = e.id AND c.resposta = 'sim'),
         p.cover_x, p.cover_y, p.avatar_x, p.avatar_y
  FROM public.profiles p, eu e
  WHERE p.id <> e.id
    AND p.profile_mode = 'publico'
    AND NOT p.is_business
    AND NOT public.is_blocked_between(e.id, p.id)
    AND NOT EXISTS (SELECT 1 FROM public.curtidas c WHERE c.de = e.id AND c.para = p.id)
    AND NOT EXISTS (SELECT 1 FROM public.connections k WHERE k.status = 'aceita'
          AND ((k.requester_id = e.id AND k.addressee_id = p.id)
            OR (k.addressee_id = e.id AND k.requester_id = p.id)))
  ORDER BY 15 DESC, 13 DESC, p.created_at DESC
  LIMIT least(greatest(coalesce(_limite, 20), 1), 50)
$$;
REVOKE ALL ON FUNCTION public.pessoas_para_combinar(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pessoas_para_combinar(integer) TO authenticated;
