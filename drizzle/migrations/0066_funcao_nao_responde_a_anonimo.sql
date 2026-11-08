-- 0066 — Nenhuma função SECURITY DEFINER responde a quem não está logado.
--
-- Rollback: GRANT EXECUTE ... TO anon nas funções listadas (não recomendado).
--
-- ====================================================================
-- O FURO, e por que ele é maior do que parecia
-- ====================================================================
-- A auditoria do Instinct (07/11) achou `perfil_de_amigo` executável por
-- **anon e PUBLIC**: qualquer pessoa, sem login nenhum, com o UUID na mão,
-- lia apelido, sobre, interesses, foto e cidade — furando a porta de login
-- da tela /nommi/<id>. A causa: `DROP FUNCTION` + `CREATE FUNCTION` **zera a
-- ACL** e o padrão do Postgres é EXECUTE para PUBLIC. A 0064 fechou as irmãs
-- e esqueceu essa, porque ela tinha sido recriada com DROP.
--
-- Ao varrer, o furo era de **41 funções**, 26 delas SECURITY DEFINER — entre
-- elas `minhas_conversas`, `list_teias`, `lugares_da_cidade` e
-- `pippo_puxa_assunto`. A maioria tem guarda no corpo (`IF auth.uid() IS NULL
-- THEN RETURN`), mas guarda no corpo é a segunda linha de defesa, não a
-- primeira: basta uma função nova esquecer a guarda para a porta estar aberta.
--
-- ====================================================================
-- O QUE FICA ABERTO, DE PROPÓSITO
-- ====================================================================
--   tribo_publica          — a página pública da tribo é anônima por desenho.
--   is_teia_member
--   pode_criar_role_na_tribo
--   posso_ver_a_mensagem   — estas três são citadas dentro de políticas RLS.
--                            Revogar faria a leitura de quem não está logado
--                            virar **erro de permissão** em vez de vazio, e
--                            elas só devolvem booleano sobre quem chama.
--
-- As funções puras (sem SECURITY DEFINER) continuam abertas: `sem_acento`,
-- `texto_simples`, as listas de palavrão — não leem tabela, e as listas já
-- vivem no código do navegador. Fechar ali seria teatro.
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS assinatura
      FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
     WHERE ns.nspname = 'public' AND p.prokind = 'f' AND p.prosecdef
       AND has_function_privilege('anon', p.oid, 'EXECUTE')
       AND p.proname NOT IN ('tribo_publica','is_teia_member',
                             'pode_criar_role_na_tribo','posso_ver_a_mensagem')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f.assinatura);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.assinatura);
  END LOOP;
END $$;

-- ====================================================================
-- E o bloqueio, que o ramo público ignorava
-- ====================================================================
-- O WHERE era `(profile_mode='publico' OR sao_amigos(...))`. `sao_amigos`
-- cobre bloqueio; o ramo público não cobria. A política da tabela esconde
-- perfil público de quem foi bloqueado — a RPC entregava. E como a tela usa a
-- RPC quando a tabela devolve vazio, na prática **quem foi bloqueado via o
-- perfil**. Agora o bloqueio vale nos dois ramos.
CREATE OR REPLACE FUNCTION public.perfil_de_amigo(_id uuid)
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
     AND NOT public.is_blocked_between(auth.uid(), p.id)
     AND (p.profile_mode = 'publico' OR public.sao_amigos(auth.uid(), p.id));
$$;
REVOKE ALL ON FUNCTION public.perfil_de_amigo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.perfil_de_amigo(uuid) TO authenticated;
