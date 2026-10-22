-- Contas e tribos de teste existem para a equipe ver a tela cheia.
-- Regra inegociável: pessoa real nunca vê gente inventada. A trava fica aqui, no banco,
-- não na tela — tela a gente esquece de filtrar, o banco não.

ALTER TABLE public.teias ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.ve_contas_de_teste()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;
REVOKE ALL ON FUNCTION public.ve_contas_de_teste() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ve_contas_de_teste() TO authenticated;

-- 1. Busca e leitura direta de perfil.
DROP POLICY IF EXISTS "Ver perfis públicos ou o próprio" ON public.profiles;
CREATE POLICY "Ver perfis públicos ou o próprio" ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR (profile_mode = 'publico'
      AND NOT public.is_blocked_between(auth.uid(), id)
      AND (NOT is_test OR public.ve_contas_de_teste()))
);

-- 2. O baralho do match.
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
    AND (NOT p.is_test OR public.ve_contas_de_teste())
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

-- 3. O radar.
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
    AND (NOT p.is_test OR public.ve_contas_de_teste())
    AND NOT public.is_blocked_between(auth.uid(), r.user_id)
    AND (6371 * acos(least(1, greatest(-1,
          cos(radians(_lat)) * cos(radians(r.lat)) * cos(radians(r.lng) - radians(_lng))
          + sin(radians(_lat)) * sin(radians(r.lat)))))) <= least(greatest(_km, 1), 50)
  ORDER BY 8
  LIMIT 50
$$;

-- 4. Os números do app. Contagem com gente de teste dentro é número mentiroso.
CREATE OR REPLACE FUNCTION public.pulso_da_nommi()
RETURNS TABLE (pessoas integer, tribos integer, roles_abertos integer, encontros_marcados integer,
               mensagens_semana integer, entraram_semana integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*)::int FROM public.profiles
      WHERE nickname <> '' AND NOT is_business AND (NOT is_test OR public.ve_contas_de_teste())),
    (SELECT count(*)::int FROM public.teias
      WHERE kind = 'teia' AND (NOT is_test OR public.ve_contas_de_teste())),
    (SELECT count(*)::int FROM public.teias
      WHERE kind = 'role' AND (starts_at IS NULL OR starts_at > now())
        AND (NOT is_test OR public.ve_contas_de_teste())),
    (SELECT count(*)::int FROM public.teia_rsvps r
      WHERE EXISTS (SELECT 1 FROM public.teias t WHERE t.id = r.teia_id
                      AND (NOT t.is_test OR public.ve_contas_de_teste()))),
    (SELECT count(*)::int FROM public.teia_messages WHERE created_at > now() - interval '7 days'),
    (SELECT count(*)::int FROM public.teia_members WHERE joined_at > now() - interval '7 days')
  WHERE auth.uid() IS NOT NULL
$$;

-- 5. As listas de tribos.
CREATE OR REPLACE FUNCTION public.list_teias(_creator uuid DEFAULT NULL::uuid, _id bigint DEFAULT NULL::bigint)
RETURNS TABLE(id bigint, kind text, name text, mode text, category text, city text, place text,
              when_text text, creator_nickname text, created_at timestamptz, starts_at timestamptz,
              capacity integer, going_count integer, i_am_going boolean, about text, rule text,
              official boolean, member_count integer, i_am_member boolean, cover_path text,
              audience text, who_posts text, i_can_post boolean, i_am_creator boolean)
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
    AND (NOT t.is_test OR public.ve_contas_de_teste())
    AND (t.official OR NOT public.is_blocked_between(auth.uid(), t.created_by))
    AND (_creator IS NULL OR t.created_by = _creator)
    AND (_id IS NULL OR t.id = _id)
  ORDER BY t.official DESC, t.created_at DESC
  LIMIT 200
$$;

CREATE OR REPLACE FUNCTION public.tribos_para_mim(_limite integer DEFAULT 6)
RETURNS TABLE(id bigint, name text, about text, category text, city text, member_count integer,
              goal integer, i_am_member boolean, em_comum integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH eu AS (SELECT interests, city FROM public.profiles WHERE id = auth.uid())
  SELECT t.id, t.name, t.about, t.category, t.city,
         (SELECT count(*)::int FROM public.teia_members m WHERE m.teia_key = t.id::text),
         t.goal,
         EXISTS (SELECT 1 FROM public.teia_members m WHERE m.teia_key = t.id::text AND m.user_id = auth.uid()),
         (SELECT count(*)::int FROM unnest(COALESCE(eu.interests, '{}')) i
           WHERE lower(t.name) LIKE '%' || lower(i) || '%' OR lower(t.category) LIKE '%' || lower(i) || '%'
              OR lower(t.about) LIKE '%' || lower(i) || '%')
  FROM public.teias t, eu
  WHERE auth.uid() IS NOT NULL AND t.kind = 'teia'
    AND (NOT t.is_test OR public.ve_contas_de_teste())
    AND NOT EXISTS (SELECT 1 FROM public.teia_members m WHERE m.teia_key = t.id::text AND m.user_id = auth.uid())
  ORDER BY (SELECT count(*)::int FROM unnest(COALESCE(eu.interests, '{}')) i
             WHERE lower(t.name) LIKE '%' || lower(i) || '%' OR lower(t.category) LIKE '%' || lower(i) || '%'
                OR lower(t.about) LIKE '%' || lower(i) || '%') DESC,
           (t.city = eu.city) DESC, t.official DESC, t.id
  LIMIT greatest(1, least(_limite, 20))
$$;

-- 6. A página pessoal, mesmo com o endereço na mão.
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
    AND (p.id = auth.uid() OR (p.profile_mode = 'publico'
         AND (NOT p.is_test OR public.ve_contas_de_teste())))
$$;
REVOKE ALL ON FUNCTION public.pagina_pessoal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pagina_pessoal(uuid) TO authenticated;
