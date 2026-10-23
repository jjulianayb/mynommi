-- O fundo escolhido pela pessoa passa a viajar junto com ela no baralho:
-- é ele que pinta a tela de quem está olhando. E estar na mesma tribo passa a
-- contar afinidade — conviver vale mais que declarar.

DROP FUNCTION IF EXISTS public.pessoas_para_combinar(integer);
CREATE FUNCTION public.pessoas_para_combinar(_limite integer DEFAULT 20)
RETURNS TABLE (
  user_id uuid, nickname text, avatar_url text, cover_path text, city text, about text,
  interests text[], goals text[], places text[], looking_for text, person_verified boolean,
  em_comum text[], afinidade integer, mesma_cidade boolean, ja_me_curtiu boolean,
  cover_x smallint, cover_y smallint, avatar_x smallint, avatar_y smallint,
  background_path text, tribos_em_comum integer
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH eu AS (SELECT id, interests, goals, city FROM public.profiles WHERE id = auth.uid())
  SELECT p.id, p.nickname, p.avatar_url, p.cover_path, p.city, p.about,
         p.interests, p.goals, p.places, p.looking_for, p.person_verified,
         ARRAY(SELECT x FROM unnest(p.interests) x
                WHERE lower(x) IN (SELECT lower(y) FROM unnest(e.interests) y)),
         (cardinality(ARRAY(SELECT x FROM unnest(p.interests) x
                             WHERE lower(x) IN (SELECT lower(y) FROM unnest(e.interests) y))) * 2
          + cardinality(ARRAY(SELECT x FROM unnest(p.goals) x
                               WHERE lower(x) IN (SELECT lower(y) FROM unnest(e.goals) y)))
          + CASE WHEN lower(p.city) = lower(e.city) AND p.city <> '' THEN 1 ELSE 0 END
          + (SELECT count(*)::int FROM public.teia_members m
              WHERE m.user_id = p.id
                AND EXISTS (SELECT 1 FROM public.teia_members k
                             WHERE k.teia_key = m.teia_key AND k.user_id = e.id)))::int,
         (lower(p.city) = lower(e.city) AND p.city <> ''),
         EXISTS (SELECT 1 FROM public.curtidas c WHERE c.de = p.id AND c.para = e.id AND c.resposta = 'sim'),
         p.cover_x, p.cover_y, p.avatar_x, p.avatar_y,
         p.background_path,
         (SELECT count(*)::int FROM public.teia_members m
           WHERE m.user_id = p.id
             AND EXISTS (SELECT 1 FROM public.teia_members k
                          WHERE k.teia_key = m.teia_key AND k.user_id = e.id))
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
