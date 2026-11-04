-- Curtir mensagem no toque duplo, e o Pippo como personagem dentro da tribo.
--
-- Pedido da Ju (04/11): "o Pippo não é um guia, ele é um personagem ali dentro.
-- Ele lança um assunto, ele lança um quiz, porque aí faz as pessoas conversarem
-- e se conhecerem." E: "tem que ter a opção da pessoa curtir, dar like, igual o
-- Instagram, deu dois toques da coração."
--
-- O número que justifica isto: **41 pessoas na Tribo do Pippo e zero mensagens.**
-- Uma sala com quarenta pessoas caladas não vira conversa sozinha — alguém tem
-- que falar primeiro, e ninguém quer ser o primeiro. É para isso que serve um
-- personagem.
--
-- Por que o curtir importa mais do que parece: responder por escrito numa sala
-- com quarenta pessoas é exposição. **Tocar num coração não é.** O curtir é a
-- participação de menor atrito que existe — e a primeira pessoa a receber um
-- coração é a que volta a escrever. Sem ele, quem arriscar a primeira mensagem
-- recebe silêncio.

-- ====================================================================
-- 1. Curtir mensagem
-- ====================================================================
-- Duas colunas com chave estrangeira de verdade em vez de uma coluna "onde" com
-- o id solto. Custa uma restrição a mais e paga duas coisas: a reação **morre
-- junto com a mensagem** (cascade), e a leitura embutida do Supabase funciona,
-- que é o que evita uma segunda consulta por mensagem na tela.
CREATE TABLE IF NOT EXISTS public.reacoes_de_mensagem (
  mensagem_tribo    uuid REFERENCES public.teia_messages(id) ON DELETE CASCADE,
  mensagem_conversa uuid REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo              text NOT NULL DEFAULT 'coracao',
  created_at        timestamptz NOT NULL DEFAULT now(),
  -- Uma mensagem e só uma: nunca as duas, nunca nenhuma.
  CONSTRAINT reacao_aponta_para_uma_mensagem
    CHECK ((mensagem_tribo IS NULL) <> (mensagem_conversa IS NULL)),
  -- Um tipo só, por enquanto. O coração do Instagram não tem variante, e a
  -- reação de post (curtir/apoiar/rir) já existe em outro lugar para quem
  -- quiser nuance.
  CONSTRAINT reacao_tipo_conhecido CHECK (tipo IN ('coracao'))
);

-- Um coração por pessoa por mensagem. Toca de novo e tira — é o que o
-- Instagram faz, e é o que a Ju pediu ("like e dislike" = ligar e desligar).
CREATE UNIQUE INDEX IF NOT EXISTS reacao_uma_por_pessoa_na_tribo
  ON public.reacoes_de_mensagem (mensagem_tribo, user_id)
  WHERE mensagem_tribo IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reacao_uma_por_pessoa_na_conversa
  ON public.reacoes_de_mensagem (mensagem_conversa, user_id)
  WHERE mensagem_conversa IS NOT NULL;

ALTER TABLE public.reacoes_de_mensagem ENABLE ROW LEVEL SECURITY;

-- Quem vê a mensagem vê o coração. Quem não vê a mensagem não descobre pelo
-- coração que ela existe.
CREATE OR REPLACE FUNCTION public.posso_ver_a_mensagem(_tribo uuid, _conversa uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _tribo IS NOT NULL THEN EXISTS (
      SELECT 1 FROM public.teia_messages t
       JOIN public.teia_members m ON m.teia_key = t.teia_key
       WHERE t.id = _tribo AND m.user_id = auth.uid())
    WHEN _conversa IS NOT NULL THEN EXISTS (
      SELECT 1 FROM public.direct_messages d
       WHERE d.id = _conversa
         AND (d.sender_id = auth.uid() OR d.recipient_id = auth.uid()))
    ELSE false
  END;
$$;
GRANT EXECUTE ON FUNCTION public.posso_ver_a_mensagem(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS reacao_leitura ON public.reacoes_de_mensagem;
CREATE POLICY reacao_leitura ON public.reacoes_de_mensagem FOR SELECT TO authenticated
  USING (public.posso_ver_a_mensagem(mensagem_tribo, mensagem_conversa));

DROP POLICY IF EXISTS reacao_minha_entra ON public.reacoes_de_mensagem;
CREATE POLICY reacao_minha_entra ON public.reacoes_de_mensagem FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()
          AND public.posso_ver_a_mensagem(mensagem_tribo, mensagem_conversa));

-- Tirar o coração é sempre do próprio: ninguém descurte no lugar de outro.
DROP POLICY IF EXISTS reacao_minha_sai ON public.reacoes_de_mensagem;
CREATE POLICY reacao_minha_sai ON public.reacoes_de_mensagem FOR DELETE TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.reacoes_de_mensagem TO authenticated;

-- ====================================================================
-- 2. O Pippo puxa assunto
-- ====================================================================
-- Os textos moram **no banco**, não no navegador, e a razão é segurança: se a
-- tela mandasse o texto, qualquer pessoa poderia fazer o Pippo dizer qualquer
-- coisa. A tela só pede "puxa um assunto"; o que ele diz está escrito aqui.
--
-- Isto também é a fonte legível: este arquivo está no git, a Ju lê e corrige.
CREATE TABLE IF NOT EXISTS public.assuntos_do_pippo (
  id       bigserial PRIMARY KEY,
  tipo     text NOT NULL CHECK (tipo IN ('assunto', 'quiz')),
  texto    text NOT NULL,
  usado_em timestamptz
);
ALTER TABLE public.assuntos_do_pippo ENABLE ROW LEVEL SECURITY;
-- Ninguém lê a lista pela tela: ver o próximo assunto estraga a graça, e a
-- tela não precisa dela para nada.
REVOKE ALL ON public.assuntos_do_pippo FROM anon, authenticated;

-- As perguntas são desenhadas para três coisas ao mesmo tempo: dar para
-- responder em uma linha, revelar algo que dê gancho para outra pessoa
-- responder, e não encostar em nada íntimo (a regra da apresentação, 0038:
-- nada de estado civil, filhos, religião, renda ou corpo).
INSERT INTO public.assuntos_do_pippo (tipo, texto)
SELECT * FROM (VALUES
  ('assunto', 'Bom dia! Pergunta séria: café antes ou depois de escovar o dente?'),
  ('assunto', 'Qual foi a última coisa que te fez rir sozinho olhando o celular?'),
  ('assunto', 'Me conta um lugar da sua cidade que todo mundo deveria conhecer.'),
  ('assunto', 'Qual música você põe quando precisa levantar o astral?'),
  ('assunto', 'Qual comida você faz bem feita? Quero detalhes.'),
  ('assunto', 'Qual série você terminou e ficou com aquele vazio?'),
  ('assunto', 'Conta uma habilidade inútil que você tem. Eu começo: sei assobiar de trás pra frente.'),
  ('assunto', 'Qual o melhor conselho que já te deram?'),
  ('assunto', 'Praia ou montanha? E por quê, que essa parte é a importante.'),
  ('assunto', 'O que você faria num domingo livre, sem compromisso nenhum?'),
  ('assunto', 'Qual lugar está na sua lista pra conhecer?'),
  ('assunto', 'Me diz uma coisa que você começou esse ano e deu certo.'),
  ('assunto', 'Qual seu jeito de passar o tempo que ninguém adivinharia?'),
  ('assunto', 'O que você estava fazendo exatamente um ano atrás?'),
  ('assunto', 'Qual cheiro te leva direto pra infância?'),
  ('quiz',    'Quiz rápido: você chega adiantado, na hora, ou sempre atrasado? Responde A, B ou C que eu não conto pra ninguém.'),
  ('quiz',    'Quiz: pra conhecer alguém novo você prefere (A) um café, (B) uma caminhada ou (C) rolê com mais gente?'),
  ('quiz',    'Quiz: no grupo de amigos você é (A) quem organiza, (B) quem anima ou (C) quem só aparece?'),
  ('quiz',    'Quiz: sua energia é melhor (A) de manhã, (B) de tarde ou (C) de madrugada?'),
  ('quiz',    'Quiz: numa viagem você é (A) roteiro pronto ou (B) decide na hora?')
) AS novo(tipo, texto)
WHERE NOT EXISTS (SELECT 1 FROM public.assuntos_do_pippo);

-- Quantas horas o Pippo espera antes de puxar outro assunto. Um por dia: duas
-- perguntas no mesmo dia e ele passa de personagem a quem fala demais.
CREATE OR REPLACE FUNCTION public.intervalo_do_pippo()
RETURNS interval LANGUAGE sql IMMUTABLE AS $$ SELECT interval '20 hours' $$;

-- Puxa um assunto na Tribo do Pippo, se já passou o intervalo.
--
-- **Quem chama é a tela, quando alguém abre a tribo**, e não um horário
-- marcado. De propósito: pergunta lançada às três da manhã numa sala vazia é
-- pergunta perdida, e personagem que fala quando tem gente é mais parecido com
-- gente. Não precisa de agendador nenhum.
--
-- Devolve o id da mensagem criada, ou NULL quando não era hora.
CREATE OR REPLACE FUNCTION public.pippo_puxa_assunto()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _pippo uuid := 'a0000000-0000-4000-8000-0000000000f1';
  _tribo text;
  _assunto record;
  _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  SELECT t.id::text INTO _tribo FROM public.teias t
   WHERE t.created_by = _pippo AND t.official LIMIT 1;
  IF _tribo IS NULL THEN RETURN NULL; END IF;

  -- Só quem está na tribo faz o Pippo falar nela.
  IF NOT EXISTS (SELECT 1 FROM public.teia_members m
                  WHERE m.teia_key = _tribo AND m.user_id = auth.uid()) THEN
    RETURN NULL;
  END IF;

  -- Fila é fila: duas pessoas abrindo a tribo no mesmo segundo não geram dois
  -- assuntos. Mesma razão do LOCK em virar_embaixadora().
  LOCK TABLE public.assuntos_do_pippo IN SHARE ROW EXCLUSIVE MODE;

  IF EXISTS (SELECT 1 FROM public.teia_messages t
              WHERE t.teia_key = _tribo AND t.sender_id = _pippo
                AND t.created_at > now() - public.intervalo_do_pippo()) THEN
    RETURN NULL;
  END IF;

  SELECT * INTO _assunto FROM public.assuntos_do_pippo
   WHERE usado_em IS NULL ORDER BY id LIMIT 1;

  -- Acabou a lista: recomeça do começo em vez de o Pippo emudecer. Vinte
  -- assuntos dão três semanas; quando a volta acontecer, a tribo já tem
  -- conversa própria e a repetição não incomoda.
  IF _assunto IS NULL THEN
    UPDATE public.assuntos_do_pippo SET usado_em = NULL;
    SELECT * INTO _assunto FROM public.assuntos_do_pippo ORDER BY id LIMIT 1;
  END IF;
  IF _assunto IS NULL THEN RETURN NULL; END IF;

  INSERT INTO public.teia_messages (teia_key, sender_id, author, body)
  VALUES (_tribo, _pippo, 'Pippo', _assunto.texto)
  RETURNING id INTO _id;

  UPDATE public.assuntos_do_pippo SET usado_em = now() WHERE id = _assunto.id;
  RETURN _id;
END $$;
GRANT EXECUTE ON FUNCTION public.pippo_puxa_assunto() TO authenticated;

-- ====================================================================
-- 3. O Pippo recebe quem chega
-- ====================================================================
-- "Ele vai conversar com todo mundo que entra." A conversa um a um ao vivo é
-- outra ordem de trabalho (custa por mensagem); isto é o que resolve a parte
-- que importa: **quem chega encontra uma mensagem com o nome dela**, na frente
-- dos outros, e tem o que responder. Numa sala de quarenta calados, receber um
-- "olha quem chegou" é a diferença entre escrever e fechar o app.
CREATE OR REPLACE FUNCTION public.pippo_recebe_quem_chega()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _pippo uuid := 'a0000000-0000-4000-8000-0000000000f1';
  _tribo text;
  _nome text;
BEGIN
  SELECT t.id::text INTO _tribo FROM public.teias t
   WHERE t.created_by = _pippo AND t.official LIMIT 1;
  IF _tribo IS NULL OR NEW.teia_key <> _tribo THEN RETURN NEW; END IF;
  IF NEW.user_id = _pippo THEN RETURN NEW; END IF;
  -- Conta de teste não é recebida: a tribo é de gente.
  IF EXISTS (SELECT 1 FROM public.profiles p
              WHERE p.id = NEW.user_id AND coalesce(p.is_test, false)) THEN
    RETURN NEW;
  END IF;
  _nome := nullif(btrim(coalesce(NEW.nickname, '')), '');
  IF _nome IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.teia_messages (teia_key, sender_id, author, body)
  VALUES (_tribo, _pippo, 'Pippo',
          'Olha quem chegou: ' || _nome || '! Fala pra gente de onde você é.');
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.pippo_recebe_quem_chega() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS teia_members_pippo_recebe ON public.teia_members;
CREATE TRIGGER teia_members_pippo_recebe AFTER INSERT ON public.teia_members
  FOR EACH ROW EXECUTE FUNCTION public.pippo_recebe_quem_chega();

-- ====================================================================
-- 4. Exportar e apagar — por inteiro, como manda a regra da casa
-- ====================================================================
-- `reacoes_de_mensagem` guarda dado de pessoa (quem curtiu o quê), então entra
-- nas duas funções no mesmo commit da criação. A regra nasceu da 0040/0042,
-- quando um DELETE se perdeu numa colisão entre dois agentes, e tem teste.
-- `assuntos_do_pippo` não entra: é catálogo da nommi, não dado de ninguém.

CREATE OR REPLACE FUNCTION public.meus_dados()
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
    'embaixadora', (SELECT to_jsonb(e) FROM public.embaixadoras e WHERE e.user_id = auth.uid()),
    'pro_concedido', (SELECT to_jsonb(pc) FROM public.pro_concedido pc WHERE pc.user_id = auth.uid()),
    'avisos_push', (SELECT coalesce(jsonb_agg(to_jsonb(ps)), '[]'::jsonb) FROM public.push_subscriptions ps WHERE ps.user_id = auth.uid()),
    'registro_envios_push', (SELECT coalesce(jsonb_agg(to_jsonb(pe)), '[]'::jsonb) FROM public.push_envios pe WHERE pe.user_id = auth.uid())
  )
  WHERE auth.uid() IS NOT NULL
$function$;

CREATE OR REPLACE FUNCTION public.apagar_minha_conta()
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
END $function$;
