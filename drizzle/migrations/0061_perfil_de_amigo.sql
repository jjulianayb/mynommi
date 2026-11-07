-- 0061 — Perfil de amigo: conexões aceitas veem o perfil, sem abrir a linha inteira.
--
-- Rollback: DROP FUNCTION public.perfil_de_amigo(uuid);
--
-- ====================================================================
-- O PROBLEMA
-- ====================================================================
-- Perfis `privado` ficam invisíveis até para quem já é conexão aceita:
-- a conversa direta não abre ("Esta pessoa não está disponível"), o badge
-- de recados não zera, e /nommi/$id quebra para a amiga. O Pippo é o caso
-- mais visível: perfil privado + conexão aceita = conversa morta.
--
-- O caminho fácil seria alargar a policy de SELECT para "público OU amigo".
-- Mas o GRANT da tabela é no nível da tabela inteira: qualquer linha visível
-- pela RLS expõe TODAS as 33 colunas no payload — nascimento, instagram,
-- visto_em (último acesso), visibility (as próprias configurações de
-- privacidade), is_test. Idade e "online" têm chaves próprias no app
-- (mostrar_idade, mostrar_online); abrir a linha furava essas chaves pela API.
--
-- ====================================================================
-- O DESENHO
-- ====================================================================
-- A policy da tabela NÃO muda. Quem é público continua lendo a linha como
-- antes; quem é privado continua invisível na tabela. O que muda é uma RPC
-- SECURITY DEFINER com as colunas mínimas que as telas usam (o mesmo COLS
-- de real-profiles.ts + cover_path), que responde quando:
--   - o perfil é público (mesma regra de sempre), OU
--   - existe conexão aceita entre os dois, sem bloqueio em nenhum dos dois
--     sentidos (sao_amigos já cobre os dois casos).
-- Conta de teste continua invisível para quem não vê conta de teste.
-- Nascimento, instagram, visto_em, visibility, is_test e metadados não saem.
CREATE OR REPLACE FUNCTION public.perfil_de_amigo(_id uuid)
RETURNS TABLE(id uuid, nickname text, city text, about text, interests text[],
              avatar_url text, video_path text, avatar_figura text, cover_path text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.nickname, p.city, p.about, p.interests,
         p.avatar_url, p.video_path, p.avatar_figura, p.cover_path
    FROM public.profiles p
   WHERE p.id = _id
     AND (NOT coalesce(p.is_test, false) OR public.ve_contas_de_teste())
     AND (p.profile_mode = 'publico' OR public.sao_amigos(auth.uid(), p.id));
$$;
GRANT EXECUTE ON FUNCTION public.perfil_de_amigo(uuid) TO authenticated;
COMMENT ON FUNCTION public.perfil_de_amigo(uuid) IS
  'Colunas mínimas do perfil para quem é público ou conexão aceita (sem bloqueio). Substitui alargar a RLS da tabela, que exporia as 33 colunas.';
