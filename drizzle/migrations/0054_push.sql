-- Avisos push da nommi (pedido da Ju em 02/11): a pessoa liga os avisos pelo
-- botão do Pippo, no app instalado, e recebe um toque quando chega notificação
-- nova. Nada em massa e nada de conteúdo no aviso: só "tem novidade".
-- Tudo aqui é aditivo. Rollback: DROP TRIGGER notificacao_empurra ON
-- public.notifications; DROP FUNCTION public.avisar_push(); DROP TABLE
-- public.push_envios, public.push_subscriptions, public.push_config; e
-- repor meus_dados() e apagar_minha_conta() das migrações 0049/0050.

-- Inscrições de aviso: uma por aparelho/navegador, sempre da própria pessoa.
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX push_subscriptions_user_idx ON public.push_subscriptions (user_id);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
CREATE POLICY "Vejo minhas inscricoes" ON public.push_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Me inscrevo" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Atualizo minha inscricao" ON public.push_subscriptions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Tiro minha inscricao" ON public.push_subscriptions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Segredos do push (chave privada VAPID e o segredo do gatilho). Sem política
-- de leitura: ninguém lê por PostgREST; o servidor (service role) lê direto.
CREATE TABLE public.push_config (
  chave text PRIMARY KEY,
  valor text NOT NULL
);
ALTER TABLE public.push_config ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.push_config TO service_role;

-- Registro dos envios, para saber se os avisos estão chegando.
CREATE TABLE public.push_envios (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text,
  status int,
  erro text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.push_envios ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.push_envios TO authenticated;
GRANT ALL ON public.push_envios TO service_role;
CREATE POLICY "Vejo os envios para mim" ON public.push_envios FOR SELECT TO authenticated USING (user_id = auth.uid());

-- O carteiro precisa do pg_net; se ele não existir ainda, o aviso dentro do
-- app continua igual e o push fica quieto até a extensão entrar.
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_net;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_net não entrou: %', sqlerrm;
END $$;

-- Notificação nova no app dispara um POST para a rota /api/public/push do
-- próprio app, que faz o envio VAPID. Falha de push nunca atrapalha o aviso.
CREATE OR REPLACE FUNCTION public.avisar_push() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _url text; _segredo text;
BEGIN
  SELECT valor INTO _url FROM public.push_config WHERE chave = 'url_envio';
  SELECT valor INTO _segredo FROM public.push_config WHERE chave = 'segredo';
  IF _url IS NULL OR _segredo IS NULL THEN RETURN NEW; END IF;
  BEGIN
    PERFORM net.http_post(
      url := _url,
      body := jsonb_build_object('user_id', NEW.user_id, 'notification_id', NEW.id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-segredo', _segredo),
      timeout_milliseconds := 5000
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.avisar_push() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER notificacao_empurra AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.avisar_push();

-- Regra da casa: tabela nova com dado pessoal entra no meus_dados e no
-- apagar_minha_conta na mesma migração.

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
