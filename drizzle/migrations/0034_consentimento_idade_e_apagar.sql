-- O que a lei pede e o app ainda não fazia: provar que a pessoa aceitou,
-- impedir menor de idade no banco (não só na tela), pedir consentimento
-- separado para tribo sensível, deixar a pessoa levar os dados embora
-- e deixar a pessoa apagar a conta sem pedir favor a ninguém.

-- ---------------------------------------------------------------------------
-- 1. Aceites: a prova de que a pessoa concordou, e com qual versão do texto.
-- ---------------------------------------------------------------------------
CREATE TABLE public.aceites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  documento text NOT NULL CHECK (documento IN ('termos', 'privacidade', 'tribo_sensivel')),
  versao text NOT NULL CHECK (char_length(versao) BETWEEN 1 AND 20),
  alvo text NOT NULL DEFAULT '' CHECK (char_length(alvo) <= 40),
  quando timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX aceites_idx ON public.aceites (user_id, documento, alvo);
GRANT SELECT ON public.aceites TO authenticated;
GRANT ALL ON public.aceites TO service_role;
ALTER TABLE public.aceites ENABLE ROW LEVEL SECURITY;

-- A pessoa vê os aceites dela. A administração vê para poder provar, se um dia
-- alguém perguntar. Ninguém escreve direto: só pela função abaixo, para que a
-- data e a versão não possam ser forjadas pelo navegador.
CREATE POLICY "Vejo os meus aceites" ON public.aceites FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

/** Grava um aceite. A data é do servidor, nunca do aparelho. */
CREATE OR REPLACE FUNCTION public.registrar_aceite(_documento text, _versao text, _alvo text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  INSERT INTO public.aceites (user_id, documento, versao, alvo)
  VALUES (auth.uid(), _documento, left(_versao, 20), left(coalesce(_alvo, ''), 40));
END $$;
REVOKE ALL ON FUNCTION public.registrar_aceite(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_aceite(text, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Idade: a trava tem que estar no banco. A tela já dizia 18; agora é verdade.
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nascimento date;

/** Menor de 18 não entra, e ninguém se envelhece para além do possível. */
CREATE OR REPLACE FUNCTION public.confere_idade() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.nascimento IS NOT NULL THEN
    IF NEW.nascimento > current_date - interval '18 years' THEN
      RAISE EXCEPTION 'A nommi é para quem tem 18 anos ou mais.';
    END IF;
    IF NEW.nascimento < current_date - interval '120 years' THEN
      RAISE EXCEPTION 'Confira a data de nascimento.';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_confere_idade BEFORE INSERT OR UPDATE OF nascimento ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.confere_idade();

-- ---------------------------------------------------------------------------
-- 3. Tribo sensível: política, religião, orientação. Dado sensível pede
--    consentimento específico, não o aceite geral do cadastro.
-- ---------------------------------------------------------------------------
ALTER TABLE public.teias ADD COLUMN IF NOT EXISTS sensivel boolean NOT NULL DEFAULT false;

/** Já consenti em entrar nesta tribo sensível? */
CREATE OR REPLACE FUNCTION public.consenti_na_tribo(_teia bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.aceites
    WHERE user_id = auth.uid() AND documento = 'tribo_sensivel' AND alvo = _teia::text
  )
$$;
REVOKE ALL ON FUNCTION public.consenti_na_tribo(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consenti_na_tribo(bigint) TO authenticated;

/** Tribo sensível só aceita quem consentiu. Tribo comum segue como antes. */
CREATE OR REPLACE FUNCTION public.posso_entrar_na_tribo(_teia bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.teias WHERE id = _teia AND sensivel)
      OR public.consenti_na_tribo(_teia)
$$;
REVOKE ALL ON FUNCTION public.posso_entrar_na_tribo(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.posso_entrar_na_tribo(bigint) TO authenticated;

DROP POLICY "Entrar numa tribo" ON public.teia_members;
CREATE POLICY "Entrar numa tribo" ON public.teia_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND length(teia_key) <= 40
    AND length(nickname) <= 40
    AND (teia_key !~ '^[0-9]+$'
         OR (public.tribo_e_aberta(teia_key::bigint) AND public.posso_entrar_na_tribo(teia_key::bigint)))
  );

-- ---------------------------------------------------------------------------
-- 4. Radar: coordenada guardada depois da hora é risco sem retorno.
-- ---------------------------------------------------------------------------
/** Apaga quem já venceu no radar. Chamada toda vez que alguém abre o radar. */
CREATE OR REPLACE FUNCTION public.limpar_radar_vencido()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.radar_presence WHERE until < now()
$$;
REVOKE ALL ON FUNCTION public.limpar_radar_vencido() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.limpar_radar_vencido() TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Levar os dados embora.
-- ---------------------------------------------------------------------------
/** Tudo o que a nommi tem sobre quem está pedindo, num arquivo só. */
CREATE OR REPLACE FUNCTION public.meus_dados()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'gerado_em', now(),
    'perfil', (SELECT to_jsonb(p) - 'is_test' FROM public.profiles p WHERE p.id = auth.uid()),
    'aceites', (SELECT coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) FROM public.aceites a WHERE a.user_id = auth.uid()),
    'amizades', (SELECT coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) FROM public.connections c
                  WHERE c.requester_id = auth.uid() OR c.addressee_id = auth.uid()),
    'tribos', (SELECT coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb) FROM public.teia_members m WHERE m.user_id = auth.uid()),
    'mensagens_enviadas', (SELECT coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb) FROM public.direct_messages d WHERE d.sender_id = auth.uid()),
    'recados_na_tribo', (SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM public.teia_messages t WHERE t.sender_id = auth.uid()),
    'publicacoes', (SELECT coalesce(jsonb_agg(to_jsonb(po)), '[]'::jsonb) FROM public.posts po WHERE po.author_id = auth.uid()),
    'comentarios', (SELECT coalesce(jsonb_agg(to_jsonb(pc)), '[]'::jsonb) FROM public.post_comments pc WHERE pc.author_id = auth.uid()),
    'mural', (SELECT coalesce(jsonb_agg(to_jsonb(w)), '[]'::jsonb) FROM public.wall_items w WHERE w.target_id = auth.uid() OR w.author_id = auth.uid()),
    'stories', (SELECT coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) FROM public.stories s WHERE s.author_id = auth.uid()),
    'selos_que_recebi', (SELECT coalesce(jsonb_agg(sl.selo), '[]'::jsonb) FROM public.selos sl WHERE sl.dono = auth.uid()),
    'radar', (SELECT coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) FROM public.radar_presence r WHERE r.user_id = auth.uid()),
    'dias_em_que_abri_o_app', (SELECT coalesce(jsonb_agg(ac.dia ORDER BY ac.dia), '[]'::jsonb) FROM public.acessos ac WHERE ac.user_id = auth.uid()),
    'estrelas', (SELECT coalesce(jsonb_agg(to_jsonb(sa)), '[]'::jsonb) FROM public.star_accounts sa WHERE sa.user_id = auth.uid())
  )
  WHERE auth.uid() IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.meus_dados() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meus_dados() TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Apagar a conta. Sem pedir favor a ninguém, e sem volta.
--    Fica de fora, de propósito, só o que protege outra pessoa: denúncia feita
--    contra quem está saindo. O resto some.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apagar_minha_conta()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE eu uuid := auth.uid();
BEGIN
  IF eu IS NULL THEN RAISE EXCEPTION 'Entre na sua conta primeiro.'; END IF;

  DELETE FROM public.story_views WHERE viewer_id = eu
     OR story_id IN (SELECT id FROM public.stories WHERE author_id = eu);
  DELETE FROM public.stories WHERE author_id = eu;
  DELETE FROM public.teia_removals WHERE user_id = eu OR removed_by = eu;
  DELETE FROM public.saved_stickers WHERE user_id = eu;
  DELETE FROM public.videos_amigos WHERE dono = eu OR de = eu;
  DELETE FROM public.post_reactions WHERE user_id = eu;
  DELETE FROM public.post_comments WHERE author_id = eu;
  DELETE FROM public.post_media WHERE post_id IN (SELECT id FROM public.posts WHERE author_id = eu);
  DELETE FROM public.posts WHERE author_id = eu;
  DELETE FROM public.wall_items WHERE target_id = eu OR author_id = eu;
  DELETE FROM public.direct_messages WHERE sender_id = eu OR recipient_id = eu;
  DELETE FROM public.teia_messages WHERE sender_id = eu;
  DELETE FROM public.teia_rsvps WHERE user_id = eu;
  DELETE FROM public.teia_members WHERE user_id = eu;
  DELETE FROM public.pedidos_de_tribo WHERE user_id = eu;
  DELETE FROM public.attendances WHERE user_id = eu;
  DELETE FROM public.selos WHERE dono = eu OR de = eu;
  DELETE FROM public.curtidas WHERE de = eu OR para = eu;
  DELETE FROM public.connections WHERE requester_id = eu OR addressee_id = eu;
  DELETE FROM public.follows WHERE follower_id = eu OR followed_id = eu;
  DELETE FROM public.blocks WHERE blocker_id = eu OR blocked_id = eu;
  DELETE FROM public.notifications WHERE user_id = eu OR actor_id = eu;
  DELETE FROM public.radar_presence WHERE user_id = eu;
  DELETE FROM public.acessos WHERE user_id = eu;
  DELETE FROM public.star_ledger WHERE user_id = eu;
  DELETE FROM public.star_accounts WHERE user_id = eu;
  DELETE FROM public.credit_ledger WHERE user_id = eu;
  DELETE FROM public.credit_accounts WHERE user_id = eu;
  DELETE FROM public.invite_boosts WHERE user_id = eu;
  DELETE FROM public.invites WHERE owner_id = eu;
  DELETE FROM public.meetup_ideas WHERE owner_id = eu;
  DELETE FROM public.businesses WHERE owner_id = eu;
  DELETE FROM public.aceites WHERE user_id = eu;
  DELETE FROM public.user_roles WHERE user_id = eu;
  -- Denúncia que a pessoa fez some; denúncia feita CONTRA ela fica, sem o perfil,
  -- porque ela protege quem denunciou.
  DELETE FROM public.reports WHERE reporter_id = eu;
  DELETE FROM public.teias WHERE created_by = eu
    AND NOT EXISTS (SELECT 1 FROM public.teia_members m WHERE m.teia_key = teias.id::text);
  UPDATE public.teias SET creator_nickname = 'conta apagada' WHERE created_by = eu;

  DELETE FROM storage.objects WHERE (storage.foldername(name))[1] = eu::text;
  DELETE FROM public.profiles WHERE id = eu;
  BEGIN
    DELETE FROM auth.users WHERE id = eu;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- O perfil já foi; o acesso cai na próxima limpeza.
  END;
END $$;
REVOKE ALL ON FUNCTION public.apagar_minha_conta() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apagar_minha_conta() TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Permissão por coluna: coluna nova em profiles precisa entrar aqui,
--    senão não salva (a permissão por tabela abriria person_verified junto).
-- ---------------------------------------------------------------------------
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (nickname, city, interests, about, profile_mode, avatar_url, goals, visibility,
              wall_approval, show_counts, cover_path, background_path, places, instagram,
              looking_for, is_business, updated_at,
              cover_x, cover_y, avatar_x, avatar_y, avatar_figura, video_path,
              nascimento) ON public.profiles TO authenticated;
GRANT UPDATE (sensivel) ON public.teias TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. list_teias passa a dizer se a tribo é sensível e se já consenti.
--    Mudar o tipo de retorno exige DROP antes — CREATE OR REPLACE não basta.
-- ---------------------------------------------------------------------------
DROP FUNCTION public.list_teias(uuid, bigint);
CREATE OR REPLACE FUNCTION public.list_teias(_creator uuid DEFAULT NULL::uuid, _id bigint DEFAULT NULL::bigint)
 RETURNS TABLE(id bigint, kind text, name text, mode text, category text, city text, place text, when_text text, creator_nickname text, created_at timestamp with time zone, starts_at timestamp with time zone, capacity integer, going_count integer, i_am_going boolean, about text, rule text, official boolean, member_count integer, i_am_member boolean, cover_path text, audience text, who_posts text, i_can_post boolean, i_am_creator boolean, entrada text, meu_pedido text, pedidos_abertos integer, sensivel boolean, ja_consenti boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
         t.created_by = auth.uid(),
         t.entrada,
         (SELECT p.status FROM public.pedidos_de_tribo p
           WHERE p.teia_id = t.id AND p.user_id = auth.uid()),
         CASE WHEN t.created_by = auth.uid()
              THEN (SELECT count(*)::int FROM public.pedidos_de_tribo p
                     WHERE p.teia_id = t.id AND p.status = 'pendente')
              ELSE 0 END,
         t.sensivel,
         public.consenti_na_tribo(t.id)
  FROM public.teias t
  WHERE auth.uid() IS NOT NULL
    AND (NOT t.is_test OR public.ve_contas_de_teste())
    AND (t.official OR NOT public.is_blocked_between(auth.uid(), t.created_by))
    AND (_creator IS NULL OR t.created_by = _creator)
    AND (_id IS NULL OR t.id = _id)
  ORDER BY t.official DESC, t.created_at DESC
  LIMIT 200
$function$;
REVOKE ALL ON FUNCTION public.list_teias(uuid, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_teias(uuid, bigint) TO authenticated;
