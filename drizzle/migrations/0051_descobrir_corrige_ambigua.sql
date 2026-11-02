-- 0051: 0049 virou plpgsql e os nomes de saída passaram a disputar com colunas
-- passaram a disputar com as colunas no CTE "eu" sem prefixo, derrubando a
-- Descobrir inteira com 42702. Prefixo p. resolve.
CREATE OR REPLACE FUNCTION public.pessoas_para_combinar(_limite integer DEFAULT 20)
RETURNS TABLE (
  user_id uuid, nickname text, avatar_url text, cover_path text, city text, about text,
  interests text[], goals text[], places text[], looking_for text, person_verified boolean,
  em_comum text[], afinidade integer, mesma_cidade boolean, ja_me_curtiu boolean,
  cover_x smallint, cover_y smallint, avatar_x smallint, avatar_y smallint
) LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE _teto integer; _restante integer;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  _teto := CASE WHEN public.tem_premium(auth.uid()) THEN 9 ELSE 3 END;
  SELECT greatest(_teto - count(DISTINCT v.visto_id), 0) INTO _restante
    FROM public.perfil_visto v
   WHERE v.user_id = auth.uid() AND v.dia = (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  IF _restante < 1 THEN RETURN; END IF;
  RETURN QUERY
  WITH eu AS (SELECT p.id, p.interests, p.goals, p.city FROM public.profiles p WHERE p.id = auth.uid()),
  pacote AS (
    SELECT p.id AS uid, p.nickname AS nick, p.avatar_url AS av, p.cover_path AS capa,
           p.city AS cid, p.about AS sob, p.interests AS ints, p.goals AS metas,
           p.places AS lugs, p.looking_for AS proc, p.person_verified AS ver,
           ARRAY(SELECT unnest(p.interests) INTERSECT SELECT unnest(e.interests)) AS comum,
           (cardinality(ARRAY(SELECT unnest(p.interests) INTERSECT SELECT unnest(e.interests))) * 2
            + cardinality(ARRAY(SELECT unnest(p.goals) INTERSECT SELECT unnest(e.goals)))
            + CASE WHEN p.city = e.city AND p.city <> '' THEN 1 ELSE 0 END)::int AS afin,
           (p.city = e.city AND p.city <> '') AS mesma,
           EXISTS (SELECT 1 FROM public.curtidas c WHERE c.de = p.id AND c.para = e.id AND c.resposta = 'sim') AS curtida,
           p.cover_x AS cx, p.cover_y AS cy, p.avatar_x AS ax, p.avatar_y AS ay
    FROM public.profiles p, eu e
    WHERE p.id <> e.id
      AND p.profile_mode = 'publico'
      AND NOT p.is_business
      AND NOT public.is_blocked_between(e.id, p.id)
      AND NOT EXISTS (SELECT 1 FROM public.curtidas c WHERE c.de = e.id AND c.para = p.id)
      AND NOT EXISTS (SELECT 1 FROM public.connections k WHERE k.status = 'aceita'
            AND ((k.requester_id = e.id AND k.addressee_id = p.id)
              OR (k.addressee_id = e.id AND k.requester_id = p.id)))
    ORDER BY curtida DESC, afin DESC, p.created_at DESC
    LIMIT least(_restante, greatest(coalesce(_limite, 20), 1), 50)
  ),
  marcadas AS (
    INSERT INTO public.perfil_visto (user_id, visto_id)
    SELECT auth.uid(), pacote.uid FROM pacote
    ON CONFLICT ON CONSTRAINT perfil_visto_pkey DO NOTHING
    RETURNING visto_id
  )
  SELECT uid, nick, av, capa, cid, sob, ints, metas, lugs, proc, ver, comum, afin, mesma,
         curtida, cx, cy, ax, ay
    FROM pacote;
END $$;
REVOKE ALL ON FUNCTION public.pessoas_para_combinar(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pessoas_para_combinar(integer) TO authenticated;
