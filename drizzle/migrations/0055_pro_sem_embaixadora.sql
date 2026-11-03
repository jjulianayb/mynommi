-- Pro sem o título de Embaixadora. (Decisão da Ju em 03/11/2026.)
-- 1. pro_concedido: Pro dado na mão, sem virar Embaixadora nem número.
-- 2. tem_premium() passa a olhar as duas tabelas — todos os limites Pro
--    (perfis/dia, match, tribos, figurinha) valem para a concedida na hora.
-- 3. selo_de(): o que o público vê de uma pessoa — é embaixadora? é pro? —
--    sem número e sem data, igual à regra de privacidade das embaixadoras.
-- Primeira concessão: Ana Flávia (conta real, pedido da Ju em 03/11/2026).
--
-- ROLLBACK (rodar à mão, nesta ordem, se precisar desfazer tudo):
--   DELETE FROM public.pro_concedido;
--   CREATE OR REPLACE FUNCTION public.tem_premium(_quem uuid DEFAULT NULL)
--   RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
--     SELECT EXISTS (SELECT 1 FROM public.embaixadoras e WHERE e.user_id = coalesce(_quem, auth.uid()))
--   $$;
--   DROP FUNCTION public.selo_de(uuid);
--   DROP TABLE public.pro_concedido;
--   (e reaplicar meus_dados/apagar_minha_conta da 0054)

CREATE TABLE IF NOT EXISTS public.pro_concedido (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  concedido_em timestamptz NOT NULL DEFAULT now(),
  motivo text NOT NULL DEFAULT ''
);
ALTER TABLE public.pro_concedido ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Vejo meu pro" ON public.pro_concedido;
CREATE POLICY "Vejo meu pro" ON public.pro_concedido FOR SELECT TO authenticated
  USING (user_id = auth.uid());
GRANT SELECT ON public.pro_concedido TO authenticated;
GRANT ALL ON public.pro_concedido TO service_role;

CREATE OR REPLACE FUNCTION public.tem_premium(_quem uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.embaixadoras e WHERE e.user_id = coalesce(_quem, auth.uid()))
      OR EXISTS (SELECT 1 FROM public.pro_concedido p WHERE p.user_id = coalesce(_quem, auth.uid()))
$$;

-- O que o público vê: é embaixadora? é pro? Número e data ficam no banco.
CREATE OR REPLACE FUNCTION public.selo_de(_quem uuid)
RETURNS TABLE (embaixadora boolean, pro boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.embaixadoras e WHERE e.user_id = _quem),
         public.tem_premium(_quem)
$$;
REVOKE ALL ON FUNCTION public.selo_de(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.selo_de(uuid) TO authenticated;

-- A primeira concessão (pedido da Ju, 03/11/2026): Ana Flávia, São Paulo.
INSERT INTO public.pro_concedido (user_id, motivo)
VALUES ('07d572ba-167c-4e41-96d5-194902e4eeaf', 'Pro dado pela Ju em 03/11/2026 (selo sem Embaixadora)')
ON CONFLICT (user_id) DO NOTHING;

-- Regra da casa: tabela nova na exportação e no apagar, por inteiro.
CREATE OR REPLACE FUNCTION public.meus_dados()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object(
    'gerado_em', now(),
    'perfil', (SELECT to_jsonb(p) - 'is_test' FROM public.profiles p WHERE p.id = auth.uid()),
    'aceites', (SELECT coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb) FROM public.aceites a WHERE a.user_id = auth.uid()),
    'amizades', (SELECT coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) FROM public.connections c
                  WHERE c.requester_id = auth.uid() OR c.addressee_id = auth.uid()),
    'sigo', (SELECT coalesce(jsonb_agg(f.followed_id), '[]'::jsonb) FROM public.follows f WHERE f.follower_id = auth.uid()),
    'me_seguem', (SELECT coalesce(jsonb_agg(f.follower_id), '[]'::jsonb) FROM public.follows f WHERE f.followed_id = auth.uid()),
    'tribos', (SELECT coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb) FROM public.teia_members m WHERE m.user_id = auth.uid()),
    'tribos_vistas', (SELECT coalesce(jsonb_agg(to_jsonb(tv)), '[]'::jsonb) FROM public.tribo_vista tv WHERE tv.user_id = auth.uid()),
    'perfis_que_vi', (SELECT coalesce(jsonb_agg(to_jsonb(pv)), '[]'::jsonb) FROM public.perfil_visto pv WHERE pv.user_id = auth.uid()),
    'lembrancas', (SELECT coalesce(jsonb_agg(to_jsonb(lb)), '[]'::jsonb) FROM public.lembrancas lb WHERE lb.user_id = auth.uid()),
    'mensagens_enviadas', (SELECT coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb) FROM public.direct_messages d WHERE d.sender_id = auth.uid()),
    'recados_na_tribo', (SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM public.teia_messages t WHERE t.sender_id = auth.uid()),
    'publicacoes', (SELECT coalesce(jsonb_agg(to_jsonb(po)), '[]'::jsonb) FROM public.posts po WHERE po.author_id = auth.uid()),
    'comentarios', (SELECT coalesce(jsonb_agg(to_jsonb(pc)), '[]'::jsonb) FROM public.post_comments pc WHERE pc.author_id = auth.uid()),
    'mural', (SELECT coalesce(jsonb_agg(to_jsonb(w)), '[]'::jsonb) FROM public.wall_items w WHERE w.target_id = auth.uid() OR w.author_id = auth.uid()),
    'stories', (SELECT coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) FROM public.stories s WHERE s.author_id = auth.uid()),
    'selos_que_recebi', (SELECT coalesce(jsonb_agg(sl.selo), '[]'::jsonb) FROM public.selos sl WHERE sl.dono = auth.uid()),
    'radar', (SELECT coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) FROM public.radar_presence r WHERE r.user_id = auth.uid()),
    'meus_lugares', (SELECT coalesce(jsonb_agg(to_jsonb(ml)), '[]'::jsonb) FROM public.meus_lugares ml WHERE ml.user_id = auth.uid()),
    'dias_em_que_abri_o_app', (SELECT coalesce(jsonb_agg(ac.dia ORDER BY ac.dia), '[]'::jsonb) FROM public.acessos ac WHERE ac.user_id = auth.uid()),
    'estrelas', (SELECT coalesce(jsonb_agg(to_jsonb(sa)), '[]'::jsonb) FROM public.star_accounts sa WHERE sa.user_id = auth.uid()),
    'embaixadora', (SELECT to_jsonb(e) FROM public.embaixadoras e WHERE e.user_id = auth.uid()),
    'pro_concedido', (SELECT to_jsonb(pc) FROM public.pro_concedido pc WHERE pc.user_id = auth.uid()),
    'avisos_push', (SELECT coalesce(jsonb_agg(to_jsonb(ps)), '[]'::jsonb) FROM public.push_subscriptions ps WHERE ps.user_id = auth.uid()),
    'registro_envios_push', (SELECT coalesce(jsonb_agg(to_jsonb(pe)), '[]'::jsonb) FROM public.push_envios pe WHERE pe.user_id = auth.uid())
  )
  WHERE auth.uid() IS NOT NULL
$$;
CREATE OR REPLACE FUNCTION public.apagar_minha_conta()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
  DELETE FROM public.tribo_vista WHERE user_id = eu;
  DELETE FROM public.perfil_visto WHERE user_id = eu;
  DELETE FROM public.lembrancas WHERE user_id = eu;
  DELETE FROM public.pedidos_de_tribo WHERE user_id = eu;
  DELETE FROM public.attendances WHERE user_id = eu;
  DELETE FROM public.selos WHERE dono = eu OR de = eu;
  DELETE FROM public.curtidas WHERE de = eu OR para = eu;
  DELETE FROM public.connections WHERE requester_id = eu OR addressee_id = eu;
  DELETE FROM public.follows WHERE follower_id = eu OR followed_id = eu;
  DELETE FROM public.blocks WHERE blocker_id = eu OR blocked_id = eu;
  DELETE FROM public.notifications WHERE user_id = eu OR actor_id = eu;
  DELETE FROM public.push_envios WHERE user_id = eu;
  DELETE FROM public.push_subscriptions WHERE user_id = eu;
  DELETE FROM public.radar_presence WHERE user_id = eu;
  DELETE FROM public.meus_lugares WHERE user_id = eu;
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
  DELETE FROM public.embaixadoras WHERE user_id = eu;
  DELETE FROM public.pro_concedido WHERE user_id = eu;
  DELETE FROM public.user_roles WHERE user_id = eu;
  DELETE FROM public.reports WHERE reporter_id = eu;
  DELETE FROM public.teias WHERE created_by = eu
    AND NOT EXISTS (SELECT 1 FROM public.teia_members m WHERE m.teia_key = teias.id::text);
  UPDATE public.teias SET creator_nickname = 'conta apagada' WHERE created_by = eu;
  PERFORM set_config('storage.allow_delete_query', 'true', true);
  DELETE FROM storage.objects WHERE (storage.foldername(name))[1] = eu::text;
  PERFORM set_config('storage.allow_delete_query', 'false', true);
  DELETE FROM public.profiles WHERE id = eu;
  BEGIN
    DELETE FROM auth.users WHERE id = eu;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
REVOKE ALL ON FUNCTION public.apagar_minha_conta() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apagar_minha_conta() TO authenticated;
