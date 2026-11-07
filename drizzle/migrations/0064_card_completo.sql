-- 0064 — Card completo: UF, "o que estou procurando", estado civil e filtros
-- com consentimento. Direção da Ju (07/11): o coração da nommi é a conversa
-- individual; o card mostra foto, nome, idade, estado civil e cidade + UF;
-- cada dado sensível só aparece — e só filtra — se a dona optou por exibir.
--
-- Rollback (na ordem):
--   DROP FUNCTION IF EXISTS public.pessoas_para_combinar(integer, text[], text, text, integer, integer);
--   <recriar pessoas_para_combinar(integer) exatamente como na 0057>
--   DROP FUNCTION IF EXISTS public.perfil_de_amigo(uuid);
--   <recriar perfil_de_amigo(uuid) exatamente como na 0061>
--   DROP FUNCTION IF EXISTS public.pagina_pessoal(uuid);
--   <recriar pagina_pessoal(uuid) exatamente como na 0062>
--   REVOKE SELECT (estado, procurando) ON public.profiles FROM authenticated;
--   REVOKE UPDATE (celular, estado, procurando, estado_civil, mostrar_estado_civil, mostrar_cidade, mostrar_idade, mostrar_online) ON public.profiles FROM authenticated;
--   ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_celular_valid,
--     DROP CONSTRAINT IF EXISTS profiles_estado_uf_valid,
--     DROP CONSTRAINT IF EXISTS profiles_procurando_valid,
--     DROP CONSTRAINT IF EXISTS profiles_estado_civil_valid,
--     DROP COLUMN IF EXISTS celular, DROP COLUMN IF EXISTS estado,
--     DROP COLUMN IF EXISTS procurando,
--     DROP COLUMN IF EXISTS estado_civil, DROP COLUMN IF EXISTS mostrar_estado_civil,
--     DROP COLUMN IF EXISTS mostrar_cidade;
--
-- ====================================================================
-- O DESENHO DE PRIVACIDADE (critério de aceite da Ju)
-- ====================================================================
-- Um dado oculto NÃO pode mudar o resultado: perfil com mostrar_idade
-- desligado não aparece ao filtrar "30-40 anos", e perfil com estado civil
-- oculto não aparece ao filtrar "solteira". O filtro casa só o valor
-- EXIBÍVEL; sem filtro, todo mundo aparece como antes. Nascimento bruto
-- nunca sai: a idade vai calculada, e só com mostrar_idade ligado.
-- cidade/UF têm chave própria (mostrar_cidade, nasce ligada para não mudar
-- nada para quem já usa). estado_civil não recebe GRANT de leitura: como o
-- nascimento, só sai pelas RPCs, e só com a chave ligada.

-- 1. Colunas novas. Vazio = não informado: nada aparece e nada se esconde
--    de quem já existe.
-- Celular entra junto (Ju, 07/11): só guardar, SEM verificação por SMS
-- (caminho de custo zero). Como o instagram, não recebe GRANT de leitura:
-- só a dona lê o próprio número, pela pagina_pessoal. Se um dia ligar a
-- verificação por código, o campo já existe.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS celular text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS procurando text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS estado_civil text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS mostrar_estado_civil boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS mostrar_cidade boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_celular_valid;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_celular_valid
  CHECK (celular = '' OR celular ~ '^[0-9+() -]{8,20}$');
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_estado_uf_valid;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_estado_uf_valid
  CHECK (estado = '' OR estado ~ '^[A-Z]{2}$');
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_procurando_valid;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_procurando_valid CHECK (
  cardinality(procurando) <= 3 AND procurando <@ ARRAY[
    'galera com os mesmos interesses',
    'uma amiga para conversar',
    'amizades para sair',
    'bate-papo leve',
    'gente na minha cidade'
  ]::text[]);
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_estado_civil_valid;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_estado_civil_valid
  -- As 5 opções que a Ju escolheu (07/11): solteiro(a), casado(a),
  -- comprometido(a), divorciado(a) e "prefiro não dizer" (guardado como vazio).
  CHECK (estado_civil IN ('','solteira','casada','comprometida','divorciada'));

-- 2. Permissões. Leitura direta só do que vai ao card sem chave (UF e
--    procurando são exibidos quando preenchidos — preencher é a opção).
--    UPDATE: os campos novos e as três chaves de exibição. mostrar_idade e
--    mostrar_online entram também: as colunas existiam sem caminho de
--    escrita no app, e a chave da idade é parte desta direção.
GRANT SELECT (estado, procurando) ON public.profiles TO authenticated;
GRANT UPDATE (celular, estado, procurando, estado_civil, mostrar_estado_civil,
              mostrar_cidade, mostrar_idade, mostrar_online) ON public.profiles TO authenticated;

-- 3. pessoas_para_combinar: mesma função da 0057 (teto do dia, sem conta de
--    teste, idade e online com chave), mais UF/procurando/estado civil na
--    saída e os cinco filtros opcionais. CREATE OR REPLACE não troca tipo de
--    retorno nem assinatura: DROP primeiro, com a versão atual relida da 0057.
DROP FUNCTION IF EXISTS public.pessoas_para_combinar(integer, text[], text, text, integer, integer);
DROP FUNCTION IF EXISTS public.pessoas_para_combinar(integer);
CREATE FUNCTION public.pessoas_para_combinar(
  _limite integer DEFAULT 20,
  _procurando text[] DEFAULT NULL,
  _uf text DEFAULT NULL,
  _estado_civil text DEFAULT NULL,
  _idade_min integer DEFAULT NULL,
  _idade_max integer DEFAULT NULL
) RETURNS TABLE(user_id uuid, nickname text, avatar_url text, cover_path text, city text,
                about text, interests text[], goals text[], places text[], looking_for text,
                person_verified boolean, em_comum text[], afinidade integer, mesma_cidade boolean,
                ja_me_curtiu boolean, cover_x smallint, cover_y smallint, avatar_x smallint,
                avatar_y smallint, idade integer, online boolean,
                estado text, procurando text[], estado_civil text)
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
           -- Cidade/UF saem (e entram no "mesma cidade" e na afinidade) só se
           -- a dona deixou: dado oculto não muda resultado nem exibição.
           CASE WHEN p.mostrar_cidade THEN p.city ELSE '' END AS cid,
           p.about AS sob, p.interests AS ints, p.goals AS metas,
           p.places AS lugs, p.looking_for AS proc, p.person_verified AS ver,
           ARRAY(SELECT unnest(p.interests) INTERSECT SELECT unnest(e.interests)) AS comum,
           (cardinality(ARRAY(SELECT unnest(p.interests) INTERSECT SELECT unnest(e.interests))) * 2
            + cardinality(ARRAY(SELECT unnest(p.goals) INTERSECT SELECT unnest(e.goals)))
            + CASE WHEN p.mostrar_cidade AND p.city = e.city AND p.city <> '' THEN 1 ELSE 0 END)::int AS afin,
           (p.mostrar_cidade AND p.city = e.city AND p.city <> '') AS mesma,
           EXISTS (SELECT 1 FROM public.curtidas c WHERE c.de = p.id AND c.para = e.id AND c.resposta = 'sim') AS curtida,
           p.cover_x AS cx, p.cover_y AS cy, p.avatar_x AS ax, p.avatar_y AS ay,
           CASE WHEN p.mostrar_idade AND p.nascimento IS NOT NULL
                THEN extract(year from age(p.nascimento))::int END AS idd,
           public.esta_online(p.visto_em, p.mostrar_online) AS onl,
           CASE WHEN p.mostrar_cidade THEN p.estado ELSE '' END AS est,
           p.procurando AS procu,
           CASE WHEN p.mostrar_estado_civil THEN p.estado_civil ELSE '' END AS civil
    FROM public.profiles p, eu e
    WHERE p.id <> e.id
      AND p.profile_mode = 'publico'
      AND NOT p.is_business
      AND (NOT coalesce(p.is_test, false) OR public.ve_contas_de_teste())
      AND NOT public.is_blocked_between(e.id, p.id)
      AND NOT EXISTS (SELECT 1 FROM public.curtidas c WHERE c.de = e.id AND c.para = p.id)
      AND NOT EXISTS (SELECT 1 FROM public.connections k WHERE k.status = 'aceita'
            AND ((k.requester_id = e.id AND k.addressee_id = p.id)
              OR (k.addressee_id = e.id AND k.requester_id = p.id)))
      -- Filtros: cada um casa só o valor EXIBÍVEL. Perfil com o dado oculto
      -- (ou vazio) simplesmente não entra quando aquele filtro está ligado.
      AND (_procurando IS NULL OR p.procurando && _procurando)
      AND (_uf IS NULL OR (p.mostrar_cidade AND p.estado = upper(_uf)))
      AND (_estado_civil IS NULL OR (p.mostrar_estado_civil AND p.estado_civil = _estado_civil))
      AND (_idade_min IS NULL OR (p.mostrar_idade AND p.nascimento IS NOT NULL
            AND extract(year from age(p.nascimento))::int >= greatest(_idade_min, 18)))
      AND (_idade_max IS NULL OR (p.mostrar_idade AND p.nascimento IS NOT NULL
            AND extract(year from age(p.nascimento))::int <= least(_idade_max, 99)))
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
         curtida, cx, cy, ax, ay, idd, onl, est, procu, civil
    FROM pacote;
END;
$function$;
REVOKE ALL ON FUNCTION public.pessoas_para_combinar(integer, text[], text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pessoas_para_combinar(integer, text[], text, text, integer, integer) TO authenticated;
COMMENT ON FUNCTION public.pessoas_para_combinar(integer, text[], text, text, integer, integer) IS
  'Baralho do Descobrir com teto do dia (0057) + UF, procurando e estado civil na carta e filtros opcionais. Dado com exibição desligada não aparece nem filtra; nascimento bruto nunca sai.';

-- 4. perfil_de_amigo: mesma regra da 0061 (público OU conexão aceita), mais
--    UF, procurando, estado civil e idade — cada um com a sua chave.
DROP FUNCTION IF EXISTS public.perfil_de_amigo(uuid);
CREATE FUNCTION public.perfil_de_amigo(_id uuid)
RETURNS TABLE(id uuid, nickname text, city text, about text, interests text[],
              avatar_url text, video_path text, avatar_figura text, cover_path text,
              estado text, procurando text[], estado_civil text, idade integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.nickname,
         CASE WHEN p.mostrar_cidade THEN p.city ELSE '' END,
         p.about, p.interests, p.avatar_url, p.video_path, p.avatar_figura, p.cover_path,
         CASE WHEN p.mostrar_cidade THEN p.estado ELSE '' END,
         p.procurando,
         CASE WHEN p.mostrar_estado_civil THEN p.estado_civil ELSE '' END,
         CASE WHEN p.mostrar_idade AND p.nascimento IS NOT NULL
              THEN extract(year from age(p.nascimento))::int END
    FROM public.profiles p
   WHERE p.id = _id
     AND (NOT coalesce(p.is_test, false) OR public.ve_contas_de_teste())
     AND (p.profile_mode = 'publico' OR public.sao_amigos(auth.uid(), p.id));
$$;
GRANT EXECUTE ON FUNCTION public.perfil_de_amigo(uuid) TO authenticated;
COMMENT ON FUNCTION public.perfil_de_amigo(uuid) IS
  'Colunas mínimas do perfil para quem é público ou conexão aceita (sem bloqueio), com UF, procurando, estado civil e idade — cada dado sensível só com a chave da dona ligada.';

-- 5. pagina_pessoal: mesma função da 0062 (20 colunas, instagram só da
--    dona), mais os campos do card completo no FIM, para não mexer na ordem
--    que os chamadores esperam. A própria pessoa sempre vê os seus; para as
--    outras, cada dado sensível respeita a chave — e as chaves em si (os
--    mostrar_*) só a dona lê.
DROP FUNCTION IF EXISTS public.pagina_pessoal(uuid);
CREATE FUNCTION public.pagina_pessoal(_user uuid)
RETURNS TABLE (id uuid, nickname text, city text, about text, interests text[], places text[],
               looking_for text, instagram text, celular text, avatar_url text, cover_path text, background_path text,
               person_verified boolean, profile_mode text,
               tribos_em_comum text[], desde timestamptz,
               cover_x smallint, cover_y smallint, avatar_x smallint, avatar_y smallint,
               avatar_figura text,
               estado text, procurando text[], estado_civil text, idade integer,
               mostrar_cidade boolean, mostrar_estado_civil boolean,
               mostrar_idade boolean, mostrar_online boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.nickname,
         CASE WHEN p.id = auth.uid() OR p.mostrar_cidade THEN p.city ELSE '' END,
         p.about, p.interests, p.places,
         p.looking_for,
         -- Instagram é canal fora do app: só a dona da conta vê o próprio.
         CASE WHEN p.id = auth.uid() THEN p.instagram ELSE '' END,
         -- Celular é como o instagram: só a dona lê o próprio.
         CASE WHEN p.id = auth.uid() THEN p.celular ELSE '' END,
         p.avatar_url, p.cover_path, p.background_path,
         p.person_verified, p.profile_mode,
         COALESCE((
           SELECT array_agg(DISTINCT t.name)
           FROM public.teia_members m
           JOIN public.teias t ON t.id::text = m.teia_key
           WHERE m.user_id = p.id
             AND EXISTS (SELECT 1 FROM public.teia_members eu WHERE eu.teia_key = m.teia_key AND eu.user_id = auth.uid())
         ), '{}'),
         p.created_at,
         p.cover_x, p.cover_y, p.avatar_x, p.avatar_y,
         p.avatar_figura,
         CASE WHEN p.id = auth.uid() OR p.mostrar_cidade THEN p.estado ELSE '' END,
         p.procurando,
         CASE WHEN p.id = auth.uid() OR p.mostrar_estado_civil THEN p.estado_civil ELSE '' END,
         CASE WHEN p.nascimento IS NOT NULL AND (p.id = auth.uid() OR p.mostrar_idade)
              THEN extract(year from age(p.nascimento))::int END,
         (p.id = auth.uid()) AND p.mostrar_cidade,
         (p.id = auth.uid()) AND p.mostrar_estado_civil,
         (p.id = auth.uid()) AND p.mostrar_idade,
         (p.id = auth.uid()) AND p.mostrar_online
    FROM public.profiles p
  WHERE p.id = _user AND auth.uid() IS NOT NULL
    AND NOT public.is_blocked_between(auth.uid(), p.id)
    AND (p.id = auth.uid() OR (p.profile_mode = 'publico'
         AND (NOT p.is_test OR public.ve_contas_de_teste())));
$$;
REVOKE ALL ON FUNCTION public.pagina_pessoal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pagina_pessoal(uuid) TO authenticated;
COMMENT ON FUNCTION public.pagina_pessoal(uuid) IS
  'Página pessoal: a dona vê tudo de si; as outras veem cidade/UF, estado civil e idade só com a chave ligada. Instagram só da dona. Nascimento bruto nunca sai.';
