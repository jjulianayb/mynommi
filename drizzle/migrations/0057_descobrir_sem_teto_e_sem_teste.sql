-- Descobrir: tira o teto enquanto a nommi é pequena, e tira a conta de teste
-- do baralho. Mais a Tribo do Pippo liberada para todos falarem.
--
-- ====================================================================
-- O BUG GRAVE (02/11): conta de teste aparecia no baralho de gente real
-- ====================================================================
-- `pessoas_para_combinar()` filtrava perfil privado e conta de empresa, e
-- **esqueceu `is_test`**. A regra da casa, escrita desde a 0026, é que toda
-- função que lista gente repete `(NOT is_test OR ve_contas_de_teste())` —
-- esta nasceu sem. Resultado: **7 contas de teste visíveis no baralho**, num
-- universo de 20 pessoas reais. Mais de um quarto das cartas era gente que
-- não existe.
--
-- Isso é exatamente a linha que a nommi disse que nunca cruzaria. Não foi
-- decisão, foi esquecimento — mas o efeito para quem está do outro lado é o
-- mesmo: ela conversa com um perfil que ninguém vai responder. Pior numa rede
-- de amizade que em qualquer outra, porque a promessa aqui é a pessoa.
--
-- O perfil do Pippo já estava de fora por ser `profile_mode = 'privado'`, não
-- pelo `is_test`. Sorte, não desenho.
--
-- ====================================================================
-- O TETO DE 3 POR DIA
-- ====================================================================
-- Decisão da Ju (02/11): desligar até a nommi passar de ~200 pessoas. Com 20
-- contas, um teto de 3 significa que a pessoa vê o baralho acabar no primeiro
-- minuto e lê "você conheceu todo mundo de hoje" — o que é verdade, e é
-- péssimo. O teto existe para o dia em que houver gente demais.
--
-- **Ele se religa sozinho.** `teto_do_descobrir()` olha quantas pessoas reais
-- existem: abaixo de 200, não há teto; a partir daí, volta a 3 (9 no Pro).
-- Teto que depende de alguém lembrar de religar é teto que fica desligado
-- para sempre.

-- Quantas pessoas reais existem na nommi. Conta de teste e conta de empresa
-- ficam fora: a régua é gente que pode virar amizade de alguém.
CREATE OR REPLACE FUNCTION public.gente_na_nommi()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.profiles p
   WHERE NOT coalesce(p.is_test, false)
     AND NOT coalesce(p.is_business, false)
     AND coalesce(p.nickname, '') <> '';
$$;
GRANT EXECUTE ON FUNCTION public.gente_na_nommi() TO authenticated;

-- Quantas pessoas por dia o Descobrir apresenta.
COMMENT ON FUNCTION public.gente_na_nommi() IS
  'Pessoas reais na nommi (sem conta de teste nem empresa). Usada pelo teto do Descobrir.';

CREATE OR REPLACE FUNCTION public.teto_do_descobrir(_quem uuid DEFAULT auth.uid())
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    -- nommi pequena: sem teto. 500 é "sem teto" na prática, e continua sendo
    -- um número (nada de NULL atravessando a conta de restante).
    WHEN public.gente_na_nommi() < 200 THEN 500
    WHEN public.tem_premium(_quem) THEN 9
    ELSE 3
  END;
$$;
GRANT EXECUTE ON FUNCTION public.teto_do_descobrir(uuid) TO authenticated;
COMMENT ON FUNCTION public.teto_do_descobrir(uuid) IS
  'Teto diário do Descobrir. Desligado enquanto a nommi tem menos de 200 pessoas; volta a 3 (9 no Pro) sozinho.';

-- Igual à 0051, com duas mudanças: o teto vem de teto_do_descobrir() e a
-- conta de teste sai do baralho.
CREATE OR REPLACE FUNCTION public.pessoas_para_combinar(_limite integer DEFAULT 20)
 RETURNS TABLE(user_id uuid, nickname text, avatar_url text, cover_path text, city text, about text, interests text[], goals text[], places text[], looking_for text, person_verified boolean, em_comum text[], afinidade integer, mesma_cidade boolean, ja_me_curtiu boolean, cover_x smallint, cover_y smallint, avatar_x smallint, avatar_y smallint, idade integer, online boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _teto integer; _restante integer;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  _teto := public.teto_do_descobrir(auth.uid());
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
           p.cover_x AS cx, p.cover_y AS cy, p.avatar_x AS ax, p.avatar_y AS ay,
           -- Idade só sai se a pessoa escolheu mostrar. A data de nascimento
           -- existe desde sempre para travar menor de 18; mostrar é escolha dela.
           CASE WHEN p.mostrar_idade AND p.nascimento IS NOT NULL
                THEN extract(year from age(p.nascimento))::int END AS idd,
           public.esta_online(p.visto_em, p.mostrar_online) AS onl
    FROM public.profiles p, eu e
    WHERE p.id <> e.id
      AND p.profile_mode = 'publico'
      AND NOT p.is_business
      -- A linha que faltava. Sem ela, gente real conversa com conta de teste.
      AND (NOT coalesce(p.is_test, false) OR public.ve_contas_de_teste())
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
         curtida, cx, cy, ax, ay, idd, onl
    FROM pacote;
END $function$;

-- ====================================================================
-- A Tribo do Pippo virou canal de recado sem querer
-- ====================================================================
-- A 0053 criou a tribo com `who_posts = 'criadora'`, então **só o Pippo
-- podia escrever**: ninguém respondia nada. Tribo onde o mascote fala sozinho
-- é feed de marca, e a razão de ela existir é justamente o contrário — ser o
-- lugar onde as pessoas se falam enquanto a nommi é pequena.
UPDATE public.teias
   SET who_posts = 'todos'
 WHERE created_by = 'a0000000-0000-4000-8000-0000000000f1';
