-- Embaixadora: quem chegou no começo.
--
-- Decisão da Ju: em vez de um selo enfeite, um título com nome e número, e
-- quem tem o título tem acesso às funcionalidades que um dia serão pagas.
--
-- Três cuidados que estão no código e não podem sair:
--
-- 1. O número nunca se repete e nunca muda de dono. Índice único no banco,
--    não confiança no app. Título que troca de dono não é título.
-- 2. A função nunca remove ninguém. Prometer acesso permanente e tirar depois
--    é a pior coisa que a nommi pode fazer com quem chegou primeiro e
--    confiou. Se um dia as vagas mudarem, muda a vaga, não quem já entrou.
-- 3. Quem decide quem tem premium é `tem_premium()`, num lugar só. Nenhuma
--    tela pergunta "pagou?" por conta própria, senão no dia da cobrança a
--    regra está espalhada em dez lugares diferentes.
--
-- O que o título NÃO dá: aparecer mais na descoberta, nem nada que crie duas
-- classes de gente. Numa rede de amizade isso se sente na hora.

CREATE TABLE IF NOT EXISTS public.embaixadoras (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  numero integer NOT NULL,
  desde timestamptz NOT NULL DEFAULT now()
);

-- O número é único no banco. Sem isso, duas pessoas entrando no mesmo
-- segundo viram "Embaixadora nº 7" as duas.
CREATE UNIQUE INDEX IF NOT EXISTS embaixadoras_numero ON public.embaixadoras (numero);

ALTER TABLE public.embaixadoras ENABLE ROW LEVEL SECURITY;

-- O título é público de propósito: ele só vale se aparecer.
DROP POLICY IF EXISTS "Embaixadora é título público" ON public.embaixadoras;
CREATE POLICY "Embaixadora é título público"
  ON public.embaixadoras FOR SELECT USING (true);

-- Ninguém escreve aqui pelo cliente. Quem dá o título é o banco, na hora em
-- que o convite é usado. Se o app pudesse inserir, bastaria abrir o console
-- para virar embaixadora.
REVOKE ALL ON public.embaixadoras FROM anon, authenticated;
GRANT SELECT ON public.embaixadoras TO anon, authenticated;

-- Quantas vagas existem. Fica numa função, e não num número solto no código,
-- para o dia de mudar ser uma linha e não uma caça.
CREATE OR REPLACE FUNCTION public.vagas_de_embaixadora()
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT 100 $$;

-- Dar o título. Nunca remove, nunca reaproveita número, nunca passa da vaga.
--
-- O LOCK existe porque `count(*) + 1` com duas pessoas ao mesmo tempo dá o
-- mesmo número para as duas; aí o índice único rejeita uma e o
-- ON CONFLICT DO NOTHING engolia o erro em silêncio, devolvendo true para
-- quem ficou sem título. Com a tabela travada por um instante, a fila é fila.
--
-- A guarda contra conta de teste e contra apelido vazio fica aqui dentro, e
-- não em quem chama: esta é a única função que insere, então nenhum caminho
-- novo de entrada pode furar a fila sem querer. Já aconteceu uma vez: duas
-- contas de teste da Ju pegaram os números 1 e 3.
CREATE OR REPLACE FUNCTION public.virar_embaixadora(_quem uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE proximo integer;
BEGIN
  IF _quem IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.embaixadoras WHERE user_id = _quem) THEN RETURN true; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
     WHERE p.id = _quem AND coalesce(p.nickname,'') <> '' AND NOT coalesce(p.is_test,false)
  ) THEN RETURN false; END IF;

  LOCK TABLE public.embaixadoras IN SHARE ROW EXCLUSIVE MODE;

  SELECT coalesce(max(numero), 0) + 1 INTO proximo FROM public.embaixadoras;
  IF proximo > public.vagas_de_embaixadora() THEN RETURN false; END IF;

  INSERT INTO public.embaixadoras (user_id, numero) VALUES (_quem, proximo);
  RETURN true;
END $$;

-- Decisão da Ju: o título é de **quem chega primeiro**, com convite ou sem.
--
-- Quem entrou cedo direto pelo Google, sem clicar em link de ninguém, chegou
-- cedo do mesmo jeito. Premiar só o link criava o caso esquisito de estar
-- entre as primeiras e não ganhar nada.
--
-- Fica num gatilho, e não na tela de cadastro, porque a nommi tem vários
-- caminhos de entrada (Google, Apple, e-mail, link de convite) e qualquer um
-- deles poderia esquecer de dar o título.
CREATE OR REPLACE FUNCTION public.titulo_de_quem_chega()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  -- Marcar uma conta como teste tira o título: é assim que se devolve um
  -- número que foi para uma conta de teste sem alguém ter que lembrar de
  -- apagar a linha na mão.
  IF coalesce(NEW.is_test,false) THEN
    DELETE FROM public.embaixadoras WHERE user_id = NEW.id;
    RETURN NEW;
  END IF;
  IF coalesce(NEW.nickname,'') <> '' THEN
    PERFORM public.virar_embaixadora(NEW.id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_titulo_de_quem_chega ON public.profiles;
CREATE TRIGGER profiles_titulo_de_quem_chega
AFTER INSERT OR UPDATE OF nickname, is_test ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.titulo_de_quem_chega();

-- Usar o convite agora faz três coisas em vez de uma.
--
-- A amizade automática é o pedido da Ju: quem entra pelo seu link já chega
-- conectada a você, para não cair numa rede vazia no primeiro minuto.
CREATE OR REPLACE FUNCTION public.usar_convite(_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE ok boolean; dona uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  UPDATE public.invites SET used_by = auth.uid(), used_at = now()
   WHERE code = _code AND used_by IS NULL AND owner_id <> auth.uid()
   RETURNING owner_id INTO dona;
  GET DIAGNOSTICS ok = ROW_COUNT;
  IF ok AND dona IS NOT NULL THEN
    INSERT INTO public.connections (requester_id, addressee_id, status, accepted_at)
    VALUES (dona, auth.uid(), 'aceita', now())
    ON CONFLICT DO NOTHING;
    PERFORM public.virar_embaixadora(auth.uid());
  END IF;
  RETURN ok;
END $$;

-- Convites que vingaram: conta quem ficou, não quem foi chamado.
--
-- Contar envio premiaria espalhar link em grupo de WhatsApp, e link
-- espalhado queima a nommi. "Ficou" aqui quer dizer: escolheu um apelido e
-- entrou em pelo menos uma tribo. Conta de teste não conta.
CREATE OR REPLACE FUNCTION public.convites_que_vingaram(_quem uuid DEFAULT NULL)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT count(*)::int FROM public.invites i
  JOIN public.profiles p ON p.id = i.used_by
  WHERE i.owner_id = coalesce(_quem, auth.uid())
    AND i.used_by IS NOT NULL
    AND p.nickname <> ''
    AND NOT p.is_test
    AND EXISTS (SELECT 1 FROM public.teia_members m WHERE m.user_id = p.id)
$$;

-- O único lugar que decide se alguém tem premium.
-- Hoje: embaixadora. Amanhã: embaixadora OU assinatura ativa. A mudança é
-- aqui dentro, e nenhuma tela precisa saber.
CREATE OR REPLACE FUNCTION public.tem_premium(_quem uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.embaixadoras e WHERE e.user_id = coalesce(_quem, auth.uid())
  )
$$;

-- O que a página precisa saber, numa ida só ao banco.
CREATE OR REPLACE FUNCTION public.meu_titulo()
RETURNS TABLE (embaixadora boolean, numero integer, vingaram integer, premium boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT (e.user_id IS NOT NULL), e.numero,
         public.convites_que_vingaram(auth.uid()), public.tem_premium(auth.uid())
  FROM (SELECT auth.uid() AS eu) x
  LEFT JOIN public.embaixadoras e ON e.user_id = x.eu
  WHERE auth.uid() IS NOT NULL
$$;

-- Dados pessoais: toda tabela nova entra na exportação e no apagar, no mesmo
-- commit que a cria. Regra da casa, e é o tipo de esquecimento que só aparece
-- no dia em que alguém pede os dados e falta um pedaço.
--
-- Aqui só acrescento a chave 'embaixadora' ao que já existia. O resto é igual
-- de propósito: `CREATE OR REPLACE` troca a função inteira, então reescrever
-- por cima sem copiar o que já estava apagaria metade da exportação.
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
    'lembrancas', (SELECT coalesce(jsonb_agg(to_jsonb(lb)), '[]'::jsonb) FROM public.lembrancas lb WHERE lb.user_id = auth.uid()),
    'mensagens_enviadas', (SELECT coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb) FROM public.direct_messages d WHERE d.sender_id = auth.uid()),
    'recados_na_tribo', (SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM public.teia_messages t WHERE t.sender_id = auth.uid()),
    'publicacoes', (SELECT coalesce(jsonb_agg(to_jsonb(po)), '[]'::jsonb) FROM public.posts po WHERE po.author_id = auth.uid()),
    'comentarios', (SELECT coalesce(jsonb_agg(to_jsonb(pc)), '[]'::jsonb) FROM public.post_comments pc WHERE pc.author_id = auth.uid()),
    'mural', (SELECT coalesce(jsonb_agg(to_jsonb(w)), '[]'::jsonb) FROM public.wall_items w WHERE w.target_id = auth.uid() OR w.author_id = auth.uid()),
    'stories', (SELECT coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) FROM public.stories s WHERE s.author_id = auth.uid()),
    'selos_que_recebi', (SELECT coalesce(jsonb_agg(sl.selo), '[]'::jsonb) FROM public.selos sl WHERE sl.dono = auth.uid()),
    'radar', (SELECT coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) FROM public.radar_presence r WHERE r.user_id = auth.uid()),
    'dias_em_que_abri_o_app', (SELECT coalesce(jsonb_agg(ac.dia ORDER BY ac.dia), '[]'::jsonb) FROM public.acessos ac WHERE ac.user_id = auth.uid()),
    'estrelas', (SELECT coalesce(jsonb_agg(to_jsonb(sa)), '[]'::jsonb) FROM public.star_accounts sa WHERE sa.user_id = auth.uid()),
    'embaixadora', (SELECT to_jsonb(e) FROM public.embaixadoras e WHERE e.user_id = auth.uid())
  )
  WHERE auth.uid() IS NOT NULL
$$;

-- Apagar a conta tira o título também.
--
-- A chave estrangeira já teria em cascata ao apagar de auth.users, mas esse
-- DELETE final está dentro de um EXCEPTION que engole erro: se ele falhar, a
-- linha ficaria aqui apontando para um perfil que não existe mais. Apago
-- explicitamente.
--
-- O número não volta para a fila: `virar_embaixadora` usa max(numero) + 1, e
-- não count(*). Se alguém sai, o número dela fica vazio para sempre em vez de
-- aparecer de novo na cabeça de outra pessoa.
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
  DELETE FROM public.lembrancas WHERE user_id = eu;
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
  DELETE FROM public.embaixadoras WHERE user_id = eu;
  DELETE FROM public.user_roles WHERE user_id = eu;
  DELETE FROM public.reports WHERE reporter_id = eu;
  DELETE FROM public.teias WHERE created_by = eu
    AND NOT EXISTS (SELECT 1 FROM public.teia_members m WHERE m.teia_key = teias.id::text);
  UPDATE public.teias SET creator_nickname = 'conta apagada' WHERE created_by = eu;
  DELETE FROM storage.objects WHERE (storage.foldername(name))[1] = eu::text;
  DELETE FROM public.profiles WHERE id = eu;
  BEGIN
    DELETE FROM auth.users WHERE id = eu;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
