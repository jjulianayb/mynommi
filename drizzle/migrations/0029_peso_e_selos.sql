-- Duas mudanças no motor do match.
--
-- 1. Interesse raro vale mais. Duas pessoas que marcaram "música" não têm nada
--    em comum — todo mundo marca música. Duas que marcaram "jogos de mesa" têm.
--    O peso é ln(1 + total de pessoas / quantas marcaram), então quanto mais
--    raro, mais alto, e nada chega a zero.
-- 2. Selos: o que os amigos dizem de alguém. Vale como sinal de afinidade,
--    porque ninguém se descreve direito, mas três amigos descrevem.

-- ---------------------------------------------------------------- selos
CREATE TABLE public.selos (
  dono uuid NOT NULL,
  de uuid NOT NULL,
  selo text NOT NULL CHECK (char_length(selo) BETWEEN 2 AND 40),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dono, de, selo),
  CHECK (dono <> de)
);
CREATE INDEX selos_dono_idx ON public.selos (dono, selo);
GRANT SELECT, INSERT, DELETE ON public.selos TO authenticated;
GRANT ALL ON public.selos TO service_role;
ALTER TABLE public.selos ENABLE ROW LEVEL SECURITY;

-- Só amizade aceita carimba, e só em nome próprio.
CREATE OR REPLACE FUNCTION public.pode_selar(_dono uuid, _de uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _de = auth.uid() AND _dono <> _de AND public.sao_amigos(_de, _dono)
$$;
REVOKE ALL ON FUNCTION public.pode_selar(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_selar(uuid, uuid) TO authenticated;

CREATE POLICY "Ver selos de quem eu posso ver" ON public.selos FOR SELECT TO authenticated
  USING (dono = auth.uid() OR de = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles p
                     WHERE p.id = dono AND p.profile_mode = 'publico'
                       AND NOT public.is_blocked_between(auth.uid(), p.id)));
CREATE POLICY "Carimbar uma amizade" ON public.selos FOR INSERT TO authenticated
  WITH CHECK (public.pode_selar(dono, de));
-- Quem deu pode tirar; e o dono da página também, porque a página é dele.
CREATE POLICY "Tirar um selo" ON public.selos FOR DELETE TO authenticated
  USING (de = auth.uid() OR dono = auth.uid());

-- Quantas pessoas deram cada selo. Nome de quem deu não sai daqui.
CREATE OR REPLACE FUNCTION public.selos_do_perfil(_user uuid)
RETURNS TABLE (selo text, quantos integer, eu_dei boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.selo, count(*)::int, bool_or(s.de = auth.uid())
  FROM public.selos s
  WHERE s.dono = _user AND auth.uid() IS NOT NULL
    AND NOT public.is_blocked_between(auth.uid(), _user)
  GROUP BY s.selo
  ORDER BY 2 DESC, 1
  LIMIT 20
$$;
REVOKE ALL ON FUNCTION public.selos_do_perfil(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.selos_do_perfil(uuid) TO authenticated;

-- ---------------------------------------------------- peso dos interesses
-- Conta só gente real: conta de teste não pode mexer na régua.
CREATE OR REPLACE FUNCTION public.peso_dos_interesses()
RETURNS TABLE (interesse text, peso numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH gente AS (
    SELECT p.interests FROM public.profiles p
    WHERE p.profile_mode = 'publico' AND NOT p.is_business AND NOT p.is_test
  ), total AS (SELECT greatest(count(*), 1)::numeric AS n FROM gente),
  contagem AS (
    SELECT lower(x) AS i, count(*)::numeric AS c
    FROM gente g, unnest(g.interests) x GROUP BY 1
  )
  SELECT c.i, round(ln(1 + t.n / c.c)::numeric, 3) FROM contagem c, total t
$$;
REVOKE ALL ON FUNCTION public.peso_dos_interesses() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.peso_dos_interesses() TO authenticated;

-- ------------------------------------------------------------- o baralho
DROP FUNCTION IF EXISTS public.pessoas_para_combinar(integer);
CREATE FUNCTION public.pessoas_para_combinar(_limite integer DEFAULT 20)
RETURNS TABLE (
  user_id uuid, nickname text, avatar_url text, cover_path text, city text, about text,
  interests text[], goals text[], places text[], looking_for text, person_verified boolean,
  em_comum text[], afinidade integer, mesma_cidade boolean, ja_me_curtiu boolean,
  cover_x smallint, cover_y smallint, avatar_x smallint, avatar_y smallint,
  background_path text, tribos_em_comum integer, selos_em_comum text[], selos_do_povo text[]
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH eu AS (SELECT id, interests, goals, city FROM public.profiles WHERE id = auth.uid()),
  peso AS (SELECT interesse, peso FROM public.peso_dos_interesses()),
  meus_selos AS (SELECT DISTINCT lower(selo) AS selo FROM public.selos WHERE dono = (SELECT id FROM eu))
  SELECT p.id, p.nickname, p.avatar_url, p.cover_path, p.city, p.about,
         p.interests, p.goals, p.places, p.looking_for, p.person_verified,
         -- o mais raro primeiro: é ele que explica melhor o encontro
         COALESCE((SELECT array_agg(x ORDER BY coalesce(w.peso, 1) DESC, x)
                   FROM unnest(p.interests) x
                   LEFT JOIN peso w ON w.interesse = lower(x)
                   WHERE lower(x) IN (SELECT lower(y) FROM unnest(e.interests) y)), '{}'),
         (round(
            coalesce((SELECT sum(coalesce(w.peso, 1)) FROM unnest(p.interests) x
                       LEFT JOIN peso w ON w.interesse = lower(x)
                       WHERE lower(x) IN (SELECT lower(y) FROM unnest(e.interests) y)), 0) * 10
          ) + cardinality(ARRAY(SELECT x FROM unnest(p.goals) x
                                 WHERE lower(x) IN (SELECT lower(y) FROM unnest(e.goals) y))) * 3
            + CASE WHEN lower(p.city) = lower(e.city) AND p.city <> '' THEN 4 ELSE 0 END
            + (SELECT count(*) FROM public.teia_members m
                WHERE m.user_id = p.id
                  AND EXISTS (SELECT 1 FROM public.teia_members k
                               WHERE k.teia_key = m.teia_key AND k.user_id = e.id)) * 6
            + (SELECT count(DISTINCT lower(s.selo)) FROM public.selos s
                WHERE s.dono = p.id AND lower(s.selo) IN (SELECT selo FROM meus_selos)) * 5
         )::int,
         (lower(p.city) = lower(e.city) AND p.city <> ''),
         EXISTS (SELECT 1 FROM public.curtidas c WHERE c.de = p.id AND c.para = e.id AND c.resposta = 'sim'),
         p.cover_x, p.cover_y, p.avatar_x, p.avatar_y,
         p.background_path,
         (SELECT count(*)::int FROM public.teia_members m
           WHERE m.user_id = p.id
             AND EXISTS (SELECT 1 FROM public.teia_members k
                          WHERE k.teia_key = m.teia_key AND k.user_id = e.id)),
         COALESCE((SELECT array_agg(DISTINCT s.selo) FROM public.selos s
                    WHERE s.dono = p.id AND lower(s.selo) IN (SELECT selo FROM meus_selos)), '{}'),
         COALESCE((SELECT array_agg(t.selo ORDER BY t.quantos DESC)
                    FROM (SELECT s.selo, count(*) AS quantos FROM public.selos s
                           WHERE s.dono = p.id GROUP BY s.selo ORDER BY 2 DESC LIMIT 3) t), '{}')
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
