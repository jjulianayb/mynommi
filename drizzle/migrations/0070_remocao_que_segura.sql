-- 0070 — A remoção passa a valer.
--
-- O AGENTS.md já afirmava, desde a 0030, que a remoção "impede a pessoa de
-- entrar de novo até alguém desfazer". **Nunca foi verdade.** Ao varrer o
-- banco, `teia_removals` era consultada por **uma** função: a de apagar a
-- conta. A tabela era só escrita: a criadora removia alguém, ficava tudo
-- registrado, e nenhuma decisão em nenhum lugar olhava esse registro. Provado
-- em transação com ROLLBACK em 16/11 (passo C do teste de tribo): a removida
-- entrou de volta na mesma hora, e `posso_entrar_na_tribo()` devolveu true com
-- a remoção registrada.
--
-- A decisão da Ju (17/11): barrada até a criadora desfazer, e não "pode pedir
-- para entrar". Quem é removida foi removida porque incomodou; deixar ela
-- mandar pedido faz a criadora receber notificação de quem ela acabou de
-- tirar, quantas vezes quiser. O perdão já existe sem isso: a criadora apaga
-- a remoção e a pessoa volta (passo D do mesmo teste).
--
-- São TRÊS portas, não duas. A terceira é a que quase passou:
--   1. entrar direto     -> política de INSERT em teia_members, que chama
--                           posso_entrar_na_tribo()
--   2. pedir para entrar -> política de INSERT em pedidos_de_tribo
--   3. ser aceita        -> responder_pedido(), que é SECURITY DEFINER e
--                           insere em teia_members **por cima da RLS**.
--                           Fechar só 1 e 2 deixaria um pedido antigo virar
--                           participação com a remoção de pé.

BEGIN;

-- 1. A pergunta, num lugar só. Separada de posso_entrar_na_tribo de propósito:
--    a tela precisa distinguir "falta consentir" de "você foi removida", e um
--    booleano só não diz qual dos dois é.
CREATE OR REPLACE FUNCTION public.fui_removida_da_tribo(_teia bigint)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teia_removals r
     WHERE r.teia_id = _teia AND r.user_id = auth.uid()
  )
$$;
REVOKE ALL ON FUNCTION public.fui_removida_da_tribo(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fui_removida_da_tribo(bigint) TO authenticated;

-- 2. Porta 1: entrar direto. CREATE OR REPLACE preserva a ACL — DROP +
--    CREATE a zeraria e abriria a função para PUBLIC (a lição da 0066).
CREATE OR REPLACE FUNCTION public.posso_entrar_na_tribo(_teia bigint)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (NOT EXISTS (SELECT 1 FROM public.teias WHERE id = _teia AND sensivel)
          OR public.consenti_na_tribo(_teia))
     AND NOT public.fui_removida_da_tribo(_teia)
$$;
REVOKE ALL ON FUNCTION public.posso_entrar_na_tribo(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.posso_entrar_na_tribo(bigint) TO authenticated;

-- 3. Porta 2: pedir para entrar. A política é recriada com a mesma condição de
--    antes mais a trava; o papel continua authenticated, conferido em
--    pg_policy antes de mexer.
DROP POLICY IF EXISTS "Pedir para entrar" ON public.pedidos_de_tribo;
CREATE POLICY "Pedir para entrar" ON public.pedidos_de_tribo
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND NOT public.tribo_e_aberta(teia_id)
    AND NOT public.fui_removida_da_tribo(teia_id)
  );

-- 4. Porta 3: ser aceita. Devolve 'removida' (valor novo) para a tela poder
--    dizer o que fazer — desfazer a remoção primeiro — em vez de um 'erro'
--    mudo. O resto da função é a versão que está em produção, intocada.
CREATE OR REPLACE FUNCTION public.responder_pedido(_teia bigint, _quem uuid, _aceitar boolean)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _nome text;
BEGIN
  IF NOT (public.is_teia_creator(_teia, auth.uid()) OR public.has_role(auth.uid(), 'admin')) THEN
    RETURN 'erro';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.pedidos_de_tribo p
                  WHERE p.teia_id = _teia AND p.user_id = _quem AND p.status = 'pendente') THEN
    RETURN 'erro';
  END IF;
  -- Aqui não dá para usar fui_removida_da_tribo(): ela pergunta por
  -- auth.uid(), que neste ponto é a criadora, não quem está sendo aceita.
  IF _aceitar AND EXISTS (SELECT 1 FROM public.teia_removals r
                           WHERE r.teia_id = _teia AND r.user_id = _quem) THEN
    RETURN 'removida';
  END IF;
  UPDATE public.pedidos_de_tribo SET status = CASE WHEN _aceitar THEN 'aceito' ELSE 'recusado' END
   WHERE teia_id = _teia AND user_id = _quem;
  IF _aceitar THEN
    SELECT coalesce(nullif(nickname, ''), 'nommi') INTO _nome FROM public.profiles WHERE id = _quem;
    INSERT INTO public.teia_members (teia_key, user_id, nickname)
    VALUES (_teia::text, _quem, _nome) ON CONFLICT DO NOTHING;
  END IF;
  RETURN CASE WHEN _aceitar THEN 'aceito' ELSE 'recusado' END;
END $$;
REVOKE ALL ON FUNCTION public.responder_pedido(bigint, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.responder_pedido(bigint, uuid, boolean) TO authenticated;

-- 5. O desfazer precisa de tela, e tela precisa de lista. A criadora já podia
--    ler teia_removals direto (política da 0030), então isto não abre nada
--    novo: só junta o apelido e a foto para a lista não ser uma coluna de
--    UUIDs.
CREATE OR REPLACE FUNCTION public.remocoes_da_tribo(_teia bigint)
RETURNS TABLE(user_id uuid, apelido text, avatar_url text, motivo text, quando timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.user_id,
         coalesce(nullif(p.nickname, ''), 'Alguém da nommi'),
         coalesce(p.avatar_url, ''),
         coalesce(r.reason, ''),
         r.created_at
    FROM public.teia_removals r
    LEFT JOIN public.profiles p ON p.id = r.user_id
   WHERE r.teia_id = _teia
     AND (public.is_teia_creator(_teia, auth.uid()) OR public.has_role(auth.uid(), 'admin'))
   ORDER BY r.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.remocoes_da_tribo(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remocoes_da_tribo(bigint) TO authenticated;

COMMIT;
