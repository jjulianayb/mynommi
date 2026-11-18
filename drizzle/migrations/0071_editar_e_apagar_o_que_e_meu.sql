-- 0071 — Editar e apagar a própria publicação e a própria mensagem da tribo.
--
-- Pedido do Instinct (item 4 do briefing de 18/11), a partir do uso da Ana
-- Flávia. O que já existia e o que faltava, conferido no banco ao vivo:
--
--   posts         UPDATE "Editar meu post"          já existia
--                 DELETE "Apagar meu post"          já existia
--   teia_messages DELETE "Apagar a própria mensagem" já existia
--                 UPDATE                            **não existia**
--   editado_em    em nenhuma das duas
--
-- Então editar publicação já funcionava no banco e ninguém sabia; editar
-- mensagem de tribo não funcionava de jeito nenhum.
--
-- Conferido antes, e por sorte estava certo: `confere_respeito` é BEFORE
-- INSERT **OR UPDATE** nas quatro tabelas de texto. Se fosse só INSERT, ligar
-- o "editar" abriria o caminho para driblar o filtro — escreve limpo, edita
-- sujo. Não abre.

BEGIN;

-- 1. Quando foi editado. Carimbo do servidor, por gatilho: data que o cliente
--    escreve é data que o cliente mente (mesma razão de registrar_aceite, 0034).
ALTER TABLE public.posts         ADD COLUMN IF NOT EXISTS editado_em timestamptz;
ALTER TABLE public.teia_messages ADD COLUMN IF NOT EXISTS editado_em timestamptz;

CREATE OR REPLACE FUNCTION public.marca_edicao()
RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- Só o texto conta como edição. Moderação mexendo em status, ou qualquer
  -- outro UPDATE, não vira "editado" na cara de quem lê.
  IF NEW.body IS DISTINCT FROM OLD.body THEN
    NEW.editado_em := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS posts_marca_edicao ON public.posts;
CREATE TRIGGER posts_marca_edicao BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.marca_edicao();

DROP TRIGGER IF EXISTS teia_messages_marca_edicao ON public.teia_messages;
CREATE TRIGGER teia_messages_marca_edicao BEFORE UPDATE ON public.teia_messages
  FOR EACH ROW EXECUTE FUNCTION public.marca_edicao();

-- 2. O furo que apareceu no caminho, e que não dá para ignorar ao ligar o
--    "editar": a permissão de UPDATE em `posts` para `authenticated` era de
--    **dez colunas** — anonymous, author_id, created_at, expires_at, id,
--    location, secret, status, teia_id e body. E a política "Editar meu post"
--    só exigia que a linha **nova** tivesse status='publicado'.
--
--    Juntos, isso dava ao autor:
--      - desfazer moderação: post removido pela moderação volta para
--        'publicado' com um UPDATE;
--      - furar o "Só entre nós": `secret=false` expõe para a tribo inteira um
--        post que era só entre membros, e `expires_at` estica o prazo além dos
--        30 dias;
--      - tirar o anonimato de si mesma depois de publicado, ou reescrever
--        author_id e created_at.
--
--    Nada disso era usado: o app **nunca** atualiza posts pelo cliente (só
--    insert, select e delete — conferido em src/lib e src/components), e a
--    moderação passa por `moderar_post()`, que é SECURITY DEFINER e não
--    depende desta permissão. Era superfície aberta sem uso.
REVOKE UPDATE ON public.posts FROM authenticated;
GRANT UPDATE (body) ON public.posts TO authenticated;
GRANT SELECT (editado_em) ON public.posts TO authenticated;

DROP POLICY IF EXISTS "Editar meu post" ON public.posts;
CREATE POLICY "Editar meu post" ON public.posts
  FOR UPDATE TO authenticated
  -- `USING` olha a linha velha: post removido pela moderação não é editável.
  USING (author_id = auth.uid() AND status = 'publicado')
  WITH CHECK (author_id = auth.uid() AND status = 'publicado');

-- 3. Editar a própria mensagem da tribo. A permissão é só do texto: apelido,
--    autor e hora não se reescrevem.
GRANT UPDATE (body) ON public.teia_messages TO authenticated;
GRANT SELECT (editado_em) ON public.teia_messages TO authenticated;

DROP POLICY IF EXISTS "Editar minha mensagem" ON public.teia_messages;
CREATE POLICY "Editar minha mensagem" ON public.teia_messages
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

COMMIT;
