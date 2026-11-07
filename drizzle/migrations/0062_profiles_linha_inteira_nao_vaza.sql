-- 0062 — profiles: a linha inteira não vaza mais pela API.
--
-- Rollback:
--   REVOKE SELECT (id, nickname, avatar_url, avatar_x, avatar_y, avatar_figura,
--     video_path, cover_path, cover_x, cover_y, background_path, city, about,
--     interests, goals, places, looking_for, topa, nao_topa, apresentacao,
--     profile_mode, is_business, person_verified, show_counts, created_at,
--     updated_at) ON public.profiles FROM authenticated;
--   GRANT SELECT ON public.profiles TO authenticated;
--   DROP FUNCTION public.quem_combina_comigo(text[]);
--   -- e restaurar o corpo da pagina_pessoal da migração 0026.
--
-- ====================================================================
-- O VAZAMENTO (06/11, revisão de privacidade pedida pela Ju)
-- ====================================================================
-- O GRANT de SELECT da tabela profiles é da tabela inteira. A RLS decide
-- QUAIS LINHAS aparecem, mas qualquer linha visível entrega TODAS as 34
-- colunas no payload da API: data de nascimento (mesmo com mostrar_idade
-- desligado), instagram, visto_em (último acesso), visibility (as próprias
-- configurações de privacidade da pessoa), is_test. Prova ao vivo com conta
-- de teste: select=* num perfil público devolveu nascimento real.
-- A RPC pagina_pessoal vazava instagram de qualquer perfil público também.
--
-- ====================================================================
-- O DESENHO
-- ====================================================================
-- 1. O GRANT passa a ser por coluna: as telas só leem as colunas que sempre
--    foram públicas por desenho (apelido, foto, cidade, interesses...).
--    nascimento, instagram, visto_em, visibility, is_test, wall_approval,
--    mostrar_idade e mostrar_online saem do alcance da API. select=* passa a
--    devolver só as colunas permitidas; pedir uma coluna revogada dá erro.
--    As RPCs SECURITY DEFINER (pessoas_para_combinar, minhas_conversas etc.)
--    não são afetadas: lá dentro a leitura é com dono da função.
-- 2. pagina_pessoal só devolve instagram quando o perfil é o da própria
--    pessoa (é lá que o Meu nommi edita). Para todo o resto, string vazia.
-- 3. A busca "quem tem meus interesses" da tela de escolher interesses
--    filtrava is_test no cliente — coluna que saiu do grant. Vira a RPC
--    quem_combina_comigo, com o filtro de conta de teste no servidor,
--    devolvendo só id, nickname e interests.
-- A RLS não muda. UPDATE/INSERT não mudam. Nenhum dado é movido.
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, nickname, avatar_url, avatar_x, avatar_y, avatar_figura,
              video_path, cover_path, cover_x, cover_y, background_path,
              city, about, interests, goals, places, looking_for, topa, nao_topa,
              apresentacao, profile_mode, is_business, person_verified, show_counts,
              created_at, updated_at)
  ON public.profiles TO authenticated;

-- CORREÇÃO ao aplicar (06/11): a versão escrita neste plano tinha 19 colunas
-- e **derrubava `avatar_figura`** — o bonequinho de quem não tem foto, que é
-- quase toda a base. A função em produção já devolvia 20, com ele no fim.
-- Como `CREATE OR REPLACE` não muda assinatura, é DROP + CREATE, e a coluna
-- fica onde estava para não mexer na ordem que os chamadores esperam.
DROP FUNCTION public.pagina_pessoal(uuid);
CREATE FUNCTION public.pagina_pessoal(_user uuid)
RETURNS TABLE (id uuid, nickname text, city text, about text, interests text[], places text[],
               looking_for text, instagram text, avatar_url text, cover_path text, background_path text,
               person_verified boolean, profile_mode text,
               tribos_em_comum text[], desde timestamptz,
               cover_x smallint, cover_y smallint, avatar_x smallint, avatar_y smallint,
               avatar_figura text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.nickname, p.city, p.about, p.interests, p.places,
         p.looking_for,
         -- Instagram é canal fora do app: só a dona da conta vê o próprio.
         CASE WHEN p.id = auth.uid() THEN p.instagram ELSE '' END,
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
         p.avatar_figura
  FROM public.profiles p
  WHERE p.id = _user AND auth.uid() IS NOT NULL
    AND NOT public.is_blocked_between(auth.uid(), p.id)
    AND (p.id = auth.uid() OR (p.profile_mode = 'publico'
         AND (NOT p.is_test OR public.ve_contas_de_teste())));
$$;
REVOKE ALL ON FUNCTION public.pagina_pessoal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pagina_pessoal(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.quem_combina_comigo(_ints text[])
RETURNS TABLE(id uuid, nickname text, interests text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.nickname, p.interests
    FROM public.profiles p
   WHERE auth.uid() IS NOT NULL
     AND p.profile_mode = 'publico'
     AND NOT p.is_business
     AND (NOT coalesce(p.is_test, false) OR public.ve_contas_de_teste())
     AND p.id <> auth.uid()
     AND p.interests && _ints
     AND NOT public.is_blocked_between(auth.uid(), p.id)
   LIMIT 20;
$$;
REVOKE ALL ON FUNCTION public.quem_combina_comigo(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.quem_combina_comigo(text[]) TO authenticated;
COMMENT ON FUNCTION public.quem_combina_comigo(text[]) IS
  'Tela de escolher interesses: perfis públicos que têm algum dos interesses. Substitui a leitura direta que filtrava is_test no cliente.';
