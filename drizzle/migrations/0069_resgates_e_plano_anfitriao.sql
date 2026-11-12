-- 0069 — Resgate por código, painel do anfitrião e plano Anfitrião.
-- Decisão da Ju (12/11): o desconto vale para TODAS as usuárias, não é
-- benefício Pro. O resgate é por código gerado no app e validado pelo
-- anfitrião no balcão. O anfitrião NUNCA recebe telefone, e-mail ou id da
-- usuária — só o apelido, na hora de validar.
--
-- Escrito a partir do briefing do Instinct, com três correções que o banco
-- de verdade exigiu (ver comentário em cada uma):
--   1. nome de coluna igual a parâmetro de saída → erro de ambiguidade;
--   2. anfitriao_status() devolvia NULL ou "não tem negócio" sempre;
--   3. tabela nova com dado de pessoa não estava entrando em meus_dados()
--      nem em apagar_minha_conta() — regra da casa.

BEGIN;

-- 1. Resgates: um código curto por vez, por usuária, por campanha.
CREATE TABLE IF NOT EXISTS public.resgates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.meetup_ideas(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  codigo text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'ativo'
    CHECK (status IN ('ativo','validado','expirado','cancelado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  validado_em timestamptz,
  -- SET NULL, não RESTRICT: se o anfitrião apagar a conta dele, a validação
  -- perde o autor mas o histórico da usuária continua de pé. Com RESTRICT o
  -- apagar_minha_conta() dele falharia calado (o DELETE de auth.users está
  -- dentro de um EXCEPTION que engole o erro) e a conta ficaria pela metade.
  validado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS resgates_user_idx ON public.resgates (user_id, status);
CREATE INDEX IF NOT EXISTS resgates_business_idx ON public.resgates (business_id, status, created_at);

-- A regra "no máximo um código ativo por campanha" não pode viver só dentro
-- da função: duas abas abertas ao mesmo tempo criariam dois. Aqui o banco
-- segura.
CREATE UNIQUE INDEX IF NOT EXISTS resgates_um_ativo_por_campanha
  ON public.resgates (user_id, campaign_id) WHERE status = 'ativo';

-- Sem leitura direta: tudo passa por RPC (o anfitrião não pode listar
-- user_id das usuárias; a usuária vê só os dela, também por RPC).
ALTER TABLE public.resgates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.resgates FROM PUBLIC, anon, authenticated;

-- 2. Oferta exclusiva do app (selo no Clube) e plano Anfitrião.
ALTER TABLE public.meetup_ideas
  ADD COLUMN IF NOT EXISTS exclusiva boolean NOT NULL DEFAULT false;
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS plano_anfitriao_ate timestamptz;
-- plano_anfitriao_ate NULL = sem plano. Enquanto o pagamento não existe,
-- a concessão é manual (igual ao pro_concedido). Cobrança entra depois.

-- 3. Usuária gera (ou reusa) o código ativo dela para uma campanha.
--    Retorna também o que o anfitrião oferece, para a tela de resgate.
CREATE OR REPLACE FUNCTION public.gerar_resgate(p_campaign uuid)
RETURNS TABLE(codigo text, expires_at timestamptz, oferta text, anfitriao text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_idea record;
  v_code text;
  v_ate timestamptz;
  v_tentativa int := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Entre na sua conta primeiro.';
  END IF;

  SELECT i.id, i.business_id, i.bonus, b.name AS nome, b.active
    INTO v_idea
    FROM public.meetup_ideas i
    JOIN public.businesses b ON b.id = i.business_id
   WHERE i.id = p_campaign AND i.status = 'publicada';
  IF NOT FOUND OR NOT v_idea.active THEN
    RAISE EXCEPTION 'Esta oferta não está disponível agora.';
  END IF;

  -- Correção 1: a tabela precisa de apelido aqui. `expires_at` também é nome
  -- de parâmetro de saída desta função, e o plpgsql trata coluna com nome
  -- igual ao de uma variável como ambiguidade — erro em tempo de execução,
  -- não de criação. Sem o `r.` a função cria sem reclamar e quebra no
  -- primeiro toque da usuária.
  UPDATE public.resgates r SET status = 'expirado'
   WHERE r.user_id = v_user AND r.status = 'ativo' AND r.expires_at < now();

  -- Reusa o código ativo que já existe para esta campanha.
  RETURN QUERY
    SELECT r.codigo, r.expires_at, v_idea.bonus, v_idea.nome
      FROM public.resgates r
     WHERE r.user_id = v_user AND r.campaign_id = p_campaign AND r.status = 'ativo'
     LIMIT 1;
  IF FOUND THEN RETURN; END IF;

  v_ate := now() + interval '30 minutes';
  LOOP
    v_tentativa := v_tentativa + 1;
    -- 4+4 caracteres, legível por telefone na tela. Sem I, L, O, 0 e 1.
    v_code := translate(
      upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      '0123456789', 'GHJKMNPQRS');
    v_code := substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4);
    BEGIN
      INSERT INTO public.resgates (campaign_id, business_id, user_id, codigo, expires_at)
      VALUES (p_campaign, v_idea.business_id, v_user, v_code, v_ate);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- Ou o sorteio repetiu um código, ou outra aba criou o código desta
      -- campanha no meio do caminho. Se já existe um ativo, é dela: devolve.
      RETURN QUERY
        SELECT r.codigo, r.expires_at, v_idea.bonus, v_idea.nome
          FROM public.resgates r
         WHERE r.user_id = v_user AND r.campaign_id = p_campaign AND r.status = 'ativo'
         LIMIT 1;
      IF FOUND THEN RETURN; END IF;
      IF v_tentativa >= 5 THEN RAISE; END IF;
    END;
  END LOOP;

  RETURN QUERY SELECT v_code, v_ate, v_idea.bonus, v_idea.nome;
END $$;
REVOKE ALL ON FUNCTION public.gerar_resgate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gerar_resgate(uuid) TO authenticated;

-- 4. Usuária cancela o código dela (só enquanto ativo).
CREATE OR REPLACE FUNCTION public.cancelar_resgate(p_codigo text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  UPDATE public.resgates SET status = 'cancelado'
   WHERE codigo = p_codigo AND user_id = auth.uid() AND status = 'ativo';
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.cancelar_resgate(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancelar_resgate(text) TO authenticated;

-- 5. Lista os resgates da própria usuária (tela "meus códigos").
CREATE OR REPLACE FUNCTION public.meus_resgates()
RETURNS TABLE(codigo text, status text, expires_at timestamptz,
              campanha text, anfitriao text, oferta text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Correção 1 de novo, e aqui eram duas: `status` e `expires_at` são os dois
  -- nome de parâmetro de saída.
  UPDATE public.resgates r SET status = 'expirado'
   WHERE r.user_id = auth.uid() AND r.status = 'ativo' AND r.expires_at < now();
  RETURN QUERY
    SELECT r.codigo, r.status, r.expires_at, i.title, b.name, i.bonus
      FROM public.resgates r
      JOIN public.meetup_ideas i ON i.id = r.campaign_id
      JOIN public.businesses b ON b.id = r.business_id
     WHERE r.user_id = auth.uid()
     ORDER BY r.created_at DESC
     LIMIT 20;
END $$;
REVOKE ALL ON FUNCTION public.meus_resgates() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meus_resgates() TO authenticated;

-- 6. Anfitrião valida o código na hora, no balcão. Só o dono do negócio
--    daquele resgate. Retorna o MÍNIMO: oferta + apelido. Nunca telefone,
--    e-mail ou id da usuária.
CREATE OR REPLACE FUNCTION public.validar_resgate(p_codigo text)
RETURNS TABLE(ok boolean, oferta text, apelido text, motivo text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_r record;
BEGIN
  SELECT r.id, r.status AS situacao, r.expires_at AS vence_em, i.bonus, p.nickname
    INTO v_r
    FROM public.resgates r
    JOIN public.meetup_ideas i ON i.id = r.campaign_id
    JOIN public.businesses b ON b.id = r.business_id
    JOIN public.profiles p ON p.id = r.user_id
   WHERE r.codigo = p_codigo AND b.owner_id = auth.uid();
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, ''::text, ''::text, 'Código não encontrado.'::text;
    RETURN;
  END IF;
  IF v_r.situacao <> 'ativo' THEN
    RETURN QUERY SELECT false, v_r.bonus, v_r.nickname,
      ('Código já ' || v_r.situacao || '.')::text;
    RETURN;
  END IF;
  IF v_r.vence_em < now() THEN
    UPDATE public.resgates SET status = 'expirado' WHERE id = v_r.id;
    RETURN QUERY SELECT false, v_r.bonus, v_r.nickname, 'Código expirado.'::text;
    RETURN;
  END IF;
  UPDATE public.resgates
     SET status = 'validado', validado_em = now(), validado_por = auth.uid()
   WHERE id = v_r.id;
  RETURN QUERY SELECT true, v_r.bonus, v_r.nickname, ''::text;
END $$;
REVOKE ALL ON FUNCTION public.validar_resgate(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validar_resgate(text) TO authenticated;

-- 7. Painel do anfitrião: números dos próprios negócios de quem chama.
CREATE OR REPLACE FUNCTION public.painel_resgates()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'emitidos_30d', count(*) FILTER (WHERE r.created_at > now() - interval '30 days'),
      'validados_30d', count(*) FILTER (WHERE r.status = 'validado' AND r.validado_em > now() - interval '30 days'),
      'validados_total', count(*) FILTER (WHERE r.status = 'validado'),
      'expirados_30d', count(*) FILTER (WHERE r.status = 'expirado' AND r.created_at > now() - interval '30 days'),
      'ativos_agora', count(*) FILTER (WHERE r.status = 'ativo' AND r.expires_at > now()),
      'por_campanha', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'titulo', t.title,
          'emitidos', t.n,
          'validados', t.v
        ) ORDER BY t.v DESC)
        FROM (
          SELECT i.title, count(*) AS n,
                 count(*) FILTER (WHERE r2.status = 'validado') AS v
            FROM public.resgates r2
            JOIN public.meetup_ideas i ON i.id = r2.campaign_id
           WHERE r2.business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
           GROUP BY i.title
        ) t
      ), '[]'::jsonb)
    )
    FROM public.resgates r
   WHERE r.business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );
END $$;
REVOKE ALL ON FUNCTION public.painel_resgates() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.painel_resgates() TO authenticated;

-- 8. Status do plano Anfitrião de quem chama (para a tela de gating).
--
-- Correção 2: a versão do briefing usava `CASE WHEN NOT FOUND` depois de um
-- SELECT dentro do RETURN. `FOUND` não é marcado por subconsulta em
-- expressão de retorno — ele nasce falso e fica falso. Resultado: com
-- negócio, o objeto final era sobrescrito com 'tem_negocio' = false; sem
-- negócio, `NULL || jsonb` devolvia NULL e a tela não recebia nada. Os dois
-- caminhos estavam errados. Aqui o SELECT INTO marca FOUND de verdade, e o
-- objeto é montado uma vez só.
CREATE OR REPLACE FUNCTION public.anfitriao_status()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ate timestamptz;
  v_tem boolean;
BEGIN
  SELECT b.plano_anfitriao_ate, true
    INTO v_ate, v_tem
    FROM public.businesses b
   WHERE b.owner_id = auth.uid()
   ORDER BY b.created_at
   LIMIT 1;
  RETURN jsonb_build_object(
    'tem_negocio', COALESCE(v_tem, false),
    'plano_ativo', (v_ate IS NOT NULL AND v_ate > now()),
    'plano_ate', v_ate
  );
END $$;
REVOKE ALL ON FUNCTION public.anfitriao_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.anfitriao_status() TO authenticated;

-- 9. Correção 3: regra da casa. Tabela nova com dado de pessoa entra nas
--    DUAS funções, a que exporta e a que apaga, na mesma migração. O
--    briefing criava `resgates` e não mexia em nenhuma das duas: os códigos
--    de alguém sobreviveriam ao apagar da conta dela, que é o contrário do
--    que o texto no ar promete. As duas funções abaixo são a versão que está
--    em produção hoje, com a linha de resgates somada — não uma reescrita de
--    memória, que foi como a linha de meus_lugares sumiu em 31/10.
CREATE OR REPLACE FUNCTION public.meus_dados()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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
    'coracoes_que_dei', (SELECT coalesce(jsonb_agg(to_jsonb(rm)), '[]'::jsonb) FROM public.reacoes_de_mensagem rm WHERE rm.user_id = auth.uid()),
    'publicacoes', (SELECT coalesce(jsonb_agg(to_jsonb(po)), '[]'::jsonb) FROM public.posts po WHERE po.author_id = auth.uid()),
    'comentarios', (SELECT coalesce(jsonb_agg(to_jsonb(pc)), '[]'::jsonb) FROM public.post_comments pc WHERE pc.author_id = auth.uid()),
    'mural', (SELECT coalesce(jsonb_agg(to_jsonb(w)), '[]'::jsonb) FROM public.wall_items w WHERE w.target_id = auth.uid() OR w.author_id = auth.uid()),
    'stories', (SELECT coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) FROM public.stories s WHERE s.author_id = auth.uid()),
    'selos_que_recebi', (SELECT coalesce(jsonb_agg(sl.selo), '[]'::jsonb) FROM public.selos sl WHERE sl.dono = auth.uid()),
    'radar', (SELECT coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) FROM public.radar_presence r WHERE r.user_id = auth.uid()),
    'meus_lugares', (SELECT coalesce(jsonb_agg(to_jsonb(ml)), '[]'::jsonb) FROM public.meus_lugares ml WHERE ml.user_id = auth.uid()),
    'dias_em_que_abri_o_app', (SELECT coalesce(jsonb_agg(ac.dia ORDER BY ac.dia), '[]'::jsonb) FROM public.acessos ac WHERE ac.user_id = auth.uid()),
    'estrelas', (SELECT coalesce(jsonb_agg(to_jsonb(sa)), '[]'::jsonb) FROM public.star_accounts sa WHERE sa.user_id = auth.uid()),
    'resgates', (SELECT coalesce(jsonb_agg(to_jsonb(rg)), '[]'::jsonb) FROM public.resgates rg WHERE rg.user_id = auth.uid()),
    'embaixadora', (SELECT to_jsonb(e) FROM public.embaixadoras e WHERE e.user_id = auth.uid()),
    'pro_concedido', (SELECT to_jsonb(pc) FROM public.pro_concedido pc WHERE pc.user_id = auth.uid()),
    'avisos_push', (SELECT coalesce(jsonb_agg(to_jsonb(ps)), '[]'::jsonb) FROM public.push_subscriptions ps WHERE ps.user_id = auth.uid()),
    'registro_envios_push', (SELECT coalesce(jsonb_agg(to_jsonb(pe)), '[]'::jsonb) FROM public.push_envios pe WHERE pe.user_id = auth.uid())
  )
  WHERE auth.uid() IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.meus_dados() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meus_dados() TO authenticated;

CREATE OR REPLACE FUNCTION public.apagar_minha_conta()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE eu uuid := auth.uid();
BEGIN
  IF eu IS NULL THEN RAISE EXCEPTION 'Entre na sua conta primeiro.'; END IF;
  DELETE FROM public.story_views WHERE viewer_id = eu
     OR story_id IN (SELECT id FROM public.stories WHERE author_id = eu);
  DELETE FROM public.stories WHERE author_id = eu;
  DELETE FROM public.teia_removals WHERE user_id = eu OR removed_by = eu;
  DELETE FROM public.saved_stickers WHERE user_id = eu;
  DELETE FROM public.videos_amigos WHERE dono = eu OR de = eu;
  DELETE FROM public.reacoes_de_mensagem WHERE user_id = eu;
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
  -- Os códigos dela saem; as validações que ela fez como anfitriã perdem só
  -- o autor, para não arrastar o histórico de outras pessoas junto.
  UPDATE public.resgates SET validado_por = NULL WHERE validado_por = eu;
  DELETE FROM public.resgates WHERE user_id = eu;
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

COMMIT;
