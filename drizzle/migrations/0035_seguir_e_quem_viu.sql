-- Pedidos da Ana, de 29/10:
-- 1. seguir alguém não avisava ninguém (a tabela follows ficou sem gatilho);
-- 2. não dava para ver quem você segue, só o número;
-- 3. story_views guardava quem viu e ninguém mostrava.

-- ---------------------------------------------------------------------------
-- 1. Aviso de novo seguidor.
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications DROP CONSTRAINT notifications_kind_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_kind_check
  CHECK (kind IN ('amizade_pedida', 'amizade_aceita', 'comentario', 'reacao', 'mural',
                  'entrou_na_tribo', 'quero_ir', 'recado_tribo', 'match', 'seguidor'));

/** Avisa quem passou a ser seguido. avisar() já respeita bloqueio e não avisa a si mesmo. */
CREATE OR REPLACE FUNCTION public.aviso_seguidor() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE quem text;
BEGIN
  SELECT coalesce(nullif(nickname, ''), 'Alguém') INTO quem
  FROM public.profiles WHERE id = NEW.follower_id;
  PERFORM public.avisar(NEW.followed_id, 'seguidor', NEW.follower_id, NULL, NULL,
    quem || ' começou a seguir você');
  RETURN NEW;
END $$;
CREATE TRIGGER follows_avisa AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.aviso_seguidor();

-- ---------------------------------------------------------------------------
-- 2. As duas listas. Número sozinho não deixa a pessoa voltar em ninguém.
--    Cada uma mostra só o que quem está olhando tem direito de ver: bloqueio
--    corta nos dois sentidos e conta de teste continua invisível.
-- ---------------------------------------------------------------------------
/** Quem eu sigo. Só a própria pessoa vê a sua lista. */
CREATE OR REPLACE FUNCTION public.quem_eu_sigo()
RETURNS TABLE (user_id uuid, nome text, cidade text, avatar text, figura text, desde timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, coalesce(nullif(p.nickname, ''), 'Alguém da nommi'), p.city, p.avatar_url,
         p.avatar_figura, f.created_at
  FROM public.follows f
  JOIN public.profiles p ON p.id = f.followed_id
  WHERE f.follower_id = auth.uid()
    AND NOT public.is_blocked_between(auth.uid(), p.id)
    AND (NOT p.is_test OR public.ve_contas_de_teste())
  ORDER BY f.created_at DESC
  LIMIT 500
$$;
REVOKE ALL ON FUNCTION public.quem_eu_sigo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.quem_eu_sigo() TO authenticated;

/** Quem me segue. Também só a própria pessoa: seguidor alheio não é vitrine. */
CREATE OR REPLACE FUNCTION public.quem_me_segue()
RETURNS TABLE (user_id uuid, nome text, cidade text, avatar text, figura text, desde timestamptz,
               eu_sigo_de_volta boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, coalesce(nullif(p.nickname, ''), 'Alguém da nommi'), p.city, p.avatar_url,
         p.avatar_figura, f.created_at,
         EXISTS (SELECT 1 FROM public.follows v
                  WHERE v.follower_id = auth.uid() AND v.followed_id = p.id)
  FROM public.follows f
  JOIN public.profiles p ON p.id = f.follower_id
  WHERE f.followed_id = auth.uid()
    AND NOT public.is_blocked_between(auth.uid(), p.id)
    AND (NOT p.is_test OR public.ve_contas_de_teste())
  ORDER BY f.created_at DESC
  LIMIT 500
$$;
REVOKE ALL ON FUNCTION public.quem_me_segue() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.quem_me_segue() TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Quem viu meu story. Só quem postou enxerga a lista.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.quem_viu_meu_story(_story uuid)
RETURNS TABLE (user_id uuid, nome text, avatar text, figura text, quando timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, coalesce(nullif(p.nickname, ''), 'Alguém da nommi'), p.avatar_url,
         p.avatar_figura, v.seen_at
  FROM public.story_views v
  JOIN public.stories s ON s.id = v.story_id
  JOIN public.profiles p ON p.id = v.viewer_id
  WHERE v.story_id = _story
    AND s.author_id = auth.uid()
    AND NOT public.is_blocked_between(auth.uid(), p.id)
    AND (NOT p.is_test OR public.ve_contas_de_teste())
  ORDER BY v.seen_at DESC
  LIMIT 200
$$;
REVOKE ALL ON FUNCTION public.quem_viu_meu_story(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.quem_viu_meu_story(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. meus_dados() esquecia os seguidores. Tabela com dado de pessoa precisa
--    aparecer no que a pessoa leva embora, senão o texto da política mente.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.meus_dados()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'gerado_em', now(),
    'perfil', (SELECT to_jsonb(p) - 'is_test' FROM public.profiles p WHERE p.id = auth.uid()),
    'aceites', (SELECT coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) FROM public.aceites a WHERE a.user_id = auth.uid()),
    'amizades', (SELECT coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) FROM public.connections c
                  WHERE c.requester_id = auth.uid() OR c.addressee_id = auth.uid()),
    'sigo', (SELECT coalesce(jsonb_agg(f.followed_id), '[]'::jsonb) FROM public.follows f WHERE f.follower_id = auth.uid()),
    'me_seguem', (SELECT coalesce(jsonb_agg(f.follower_id), '[]'::jsonb) FROM public.follows f WHERE f.followed_id = auth.uid()),
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
