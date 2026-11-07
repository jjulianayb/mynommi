-- 0065_revoga_acesso_anon_profiles.sql
-- Endurecimento pós-0064: remove TODOS os privilégios da role anon em public.profiles.
--
-- Por quê: a role anon tinha privilégios amplos herdados de grants antigos (SELECT,
-- INSERT, UPDATE, REFERENCES), cobrindo até as colunas sensíveis da 0064 (nascimento,
-- estado_civil, celular, mostrar_*). Hoje isso é inócuo porque NENHUMA policy de RLS
-- de profiles cobre anon (visitante deslogado recebe 0 linhas — verificado via REST
-- com a chave pública). Mas se uma policy futura liberar linhas para anon por engano,
-- essas colunas vazariam. Defesa em profundidade.
--
-- Verificado antes de aplicar (07/11/2026):
--   * Nenhum trecho do app (src/) lê nascimento/estado_civil/celular/mostrar_* direto
--     da tabela profiles; toda leitura sensível passa por RPCs SECURITY DEFINER
--     (perfil_de_amigo, pagina_pessoal, pessoas_para_combinar), que rodam como dono
--     da função e não dependem dos grants de anon.
--   * Todas as policies de profiles são para a role authenticated; anon não tem
--     nenhuma, então revogar não muda nenhum comportamento visível hoje.
--   * RPCs públicas não existem para anon: 0064 já revogou EXECUTE de anon em
--     pessoas_para_combinar, perfil_de_amigo e pagina_pessoal.
--
-- ROLLBACK:
--   GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE ON public.profiles TO anon;
BEGIN;
REVOKE ALL PRIVILEGES ON public.profiles FROM anon;
COMMIT;
