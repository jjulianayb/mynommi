-- As regras da nommi, e a trava que vale em toda tribo.
--
-- Dois andares, e eles não se misturam:
--   1. **As regras da nommi** valem em toda tribo e ninguém tira. Quem criou a
--      tribo não escolhe se vale ou não.
--   2. **As regras da tribo** são de quem criou aquela tribo, e valem só lá.
--
-- Por que a trava está aqui e não só na tela: a tela avisa antes de enviar, que
-- é o que ajuda a pessoa a reescrever. Mas tela se contorna. Quem recusa de
-- verdade é o banco, no gatilho, para qualquer caminho que escreva.
--
-- O que esta trava **não** faz: pegar bullying. Bullying quase nunca tem
-- palavrão — é "ninguém te chamou", é todo mundo responder menos para uma
-- pessoa, é a piada repetida. Isso só pessoa percebe, e por isso quem segura a
-- tribo continua sendo quem criou (podendo remover), a denúncia e a moderação.

-- Xingamento: palavra cujo uso é atacar alguém.
CREATE OR REPLACE FUNCTION public.palavras_de_xingamento()
RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT ARRAY[
    'vadia',
    'vagabunda',
    'piranha',
    'retardada',
    'retardado',
    'imbecil',
    'idiota',
    'burra',
    'burro',
    'gorda nojenta',
    'recalcada',
    'escrota',
    'otaria',
    'otario',
    'corna',
    'lixo de gente',
    'nojenta',
    'ridicula',
    'foder',
    'fuder'
  ] $$;

-- Ataque a um grupo inteiro. Esses não dependem de ter alvo: dizer numa roda
-- já é o ato.
CREATE OR REPLACE FUNCTION public.palavras_de_ataque_a_grupo()
RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT ARRAY[
    'viado',
    'viadinho',
    'bicha nojenta',
    'traveco',
    'sapatao nojenta',
    'preta suja',
    'mongoloide',
    'aleijada de merda',
    'volta pro seu pais'
  ] $$;

-- Palavra que **só** é ofensa quando vai endereçada, e que fora disso é
-- palavra comum: "macaca" é bicho, "crioulo" é palavra de uso corrente em
-- parte do país. Sem alvo, essas não geram nem aviso.
CREATE OR REPLACE FUNCTION public.palavras_so_com_alvo()
RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT ARRAY[
    'macaca',
    'crioula',
    'crioulo',
    'mulata'
  ] $$;

-- Deixa o texto comparável: sem acento, minúsculo, desfazendo o troca-letra
-- mais comum e encolhendo letra repetida. Não junta letras separadas por
-- espaço, de propósito: "v a c a" viraria "vaca" e a frase inocente cairia.
CREATE OR REPLACE FUNCTION public.texto_comparavel(_t text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(
           translate(lower(public.sem_acento(coalesce(_t,''))),
                     '@4013$5!|', 'aaoiessii'),
           '(.)\1{2,}', '\1', 'g')
$$;

-- O texto está endereçado a alguém?
-- Para a direção, só acento e maiúscula. `texto_comparavel` trocaria @ por a,
-- e a arroba de uma menção viraria letra.
CREATE OR REPLACE FUNCTION public.texto_simples(_t text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(public.sem_acento(coalesce(_t,'')))
$$;

CREATE OR REPLACE FUNCTION public.aponta_para_alguem(_t text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT public.texto_simples(_t) ~
    '(\mvoce\s+(e|eh|ta|esta|parece)\M|\mvc\s+(e|eh|ta|esta|parece)\M|\msua\M|\mseu\M|\mtu\s+(e|eh|ta|esta)\M|\mvai\s+(se|tomar|catar)\M|\mcala\s+a\s+boca\M|@\w)'
$$;

-- Acha a palavra inteira, para "assassina" não cair por causa de um pedaço.
CREATE OR REPLACE FUNCTION public.tem_palavra(_t text, _palavras text[])
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM unnest(_palavras) p
     WHERE public.texto_comparavel(_t) ~ ('(^|[^a-z])' || replace(p, ' ', '\s+') || '([^a-z]|$)')
  )
$$;

-- A recusa.
--
-- O nome da exceção (`nommi_xingamento`, `nommi_ataque_a_grupo`) é o que a tela
-- traduz para uma frase humana. Erro técnico na cara de quem está conversando é
-- o tipo de coisa que já corrigimos no login.
CREATE OR REPLACE FUNCTION public.confere_respeito()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE t text := coalesce(to_jsonb(NEW)->>'body', '');
BEGIN
  IF public.tem_palavra(t, public.palavras_de_ataque_a_grupo()) THEN
    RAISE EXCEPTION 'nommi_ataque_a_grupo';
  END IF;
  IF public.aponta_para_alguem(t) AND (
       public.tem_palavra(t, public.palavras_de_xingamento())
       OR public.tem_palavra(t, public.palavras_so_com_alvo())
     ) THEN
    RAISE EXCEPTION 'nommi_xingamento';
  END IF;
  RETURN NEW;
END $$;

-- Onde vale.
--
-- Os quatro lugares onde se escreve para mais de uma pessoa: o recado na
-- tribo, o post, o comentário e o mural "Meus amigos dizem" — esse último é
-- texto que **outra pessoa** escreve na sua página, e é exatamente onde uma
-- humilhação machucaria mais.
--
-- A conversa a sós entre duas amigas fica de fora de propósito: ali as duas se
-- escolheram, e quem não quer mais falar bloqueia. Trava de palavra numa
-- conversa particular entre adultas é outra coisa, e não foi o que se pediu.
DROP TRIGGER IF EXISTS teia_messages_respeito ON public.teia_messages;
CREATE TRIGGER teia_messages_respeito
BEFORE INSERT OR UPDATE OF body ON public.teia_messages
FOR EACH ROW EXECUTE FUNCTION public.confere_respeito();

DROP TRIGGER IF EXISTS posts_respeito ON public.posts;
CREATE TRIGGER posts_respeito
BEFORE INSERT OR UPDATE OF body ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.confere_respeito();

DROP TRIGGER IF EXISTS post_comments_respeito ON public.post_comments;
CREATE TRIGGER post_comments_respeito
BEFORE INSERT OR UPDATE OF body ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.confere_respeito();

DROP TRIGGER IF EXISTS wall_items_respeito ON public.wall_items;
CREATE TRIGGER wall_items_respeito
BEFORE INSERT OR UPDATE OF body ON public.wall_items
FOR EACH ROW EXECUTE FUNCTION public.confere_respeito();

-- Repõe uma linha perdida numa colisão de trabalho.
--
-- A migração 0042 (correção do 403 ao apagar a conta) foi escrita a partir da
-- 0039 e, sem querer, deixou de fora o `DELETE FROM public.meus_lugares`, que
-- entrou na 0040. Resultado: os lugares do radar de uma pessoa sobreviveriam
-- ao apagar da conta dela, que é justamente a promessa que o texto no ar faz.
--
-- Lição para a próxima colisão: **reescrever `apagar_minha_conta()` inteira a
-- cada correção é frágil.** Quem mexer nela de novo confere a lista de tabelas
-- contra `meus_dados()` antes de publicar — as duas têm que falar das mesmas
-- tabelas.
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

-- E a exportação, pelo mesmo motivo.
--
-- A migração 0040 acrescentou `meus_lugares` a `meus_dados()` **em produção**
-- mas deixou só um comentário no arquivo, em vez do corpo. Arquivo de migração
-- que não bate com o banco é pior que arquivo nenhum: quem reproduzir o banco
-- do zero recria uma versão antiga sem ninguém perceber.
--
-- Regra, agora com teste: `meus_dados()` e `apagar_minha_conta()` vão **por
-- inteiro** em toda migração que mexa nelas. Nada de "ver a migração anterior".
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
    'meus_lugares', (SELECT coalesce(jsonb_agg(to_jsonb(ml)), '[]'::jsonb) FROM public.meus_lugares ml WHERE ml.user_id = auth.uid()),
    'dias_em_que_abri_o_app', (SELECT coalesce(jsonb_agg(ac.dia ORDER BY ac.dia), '[]'::jsonb) FROM public.acessos ac WHERE ac.user_id = auth.uid()),
    'estrelas', (SELECT coalesce(jsonb_agg(to_jsonb(sa)), '[]'::jsonb) FROM public.star_accounts sa WHERE sa.user_id = auth.uid()),
    'embaixadora', (SELECT to_jsonb(e) FROM public.embaixadoras e WHERE e.user_id = auth.uid())
  )
  WHERE auth.uid() IS NOT NULL
$$;
