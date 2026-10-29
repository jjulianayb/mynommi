-- A tela inicial mostrava "Tribos para você", que é descoberta. Quem já está
-- dentro de uma tribo quer o contrário: ver as suas, saber se tem recado novo
-- e entrar. É lista de conversa, não vitrine.
--
-- Para saber o que é "novo" é preciso guardar quando a pessoa viu cada tribo.
-- Uma linha por pessoa por tribo, com a hora. Nada além disso.

CREATE TABLE public.tribo_vista (
  user_id uuid NOT NULL,
  teia_key text NOT NULL,
  visto_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, teia_key)
);
GRANT SELECT, INSERT, UPDATE ON public.tribo_vista TO authenticated;
GRANT ALL ON public.tribo_vista TO service_role;
ALTER TABLE public.tribo_vista ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vejo a minha marca" ON public.tribo_vista FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Marco a minha" ON public.tribo_vista FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Atualizo a minha" ON public.tribo_vista FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

/** Entrei na tribo: daqui para trás está tudo lido. */
CREATE OR REPLACE FUNCTION public.marcar_tribo_vista(_teia text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.tribo_vista (user_id, teia_key, visto_em)
  SELECT auth.uid(), left(_teia, 40), now() WHERE auth.uid() IS NOT NULL
  ON CONFLICT (user_id, teia_key) DO UPDATE SET visto_em = now()
$$;
REVOKE ALL ON FUNCTION public.marcar_tribo_vista(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marcar_tribo_vista(text) TO authenticated;

/**
 * As minhas tribos, com a última fala e quantas eu ainda não vi.
 * A própria fala da pessoa nunca conta como não lida.
 * Tribo com recado novo vem primeiro: é o que ela abriu o app para ver.
 */
CREATE OR REPLACE FUNCTION public.minhas_tribos()
RETURNS TABLE (
  id bigint, nome text, cover_path text, membros integer,
  ultima_fala text, ultimo_autor text, ultima_em timestamptz, nao_lidas integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id,
         CASE WHEN t.official THEN t.name ELSE t.name END,
         t.cover_path,
         (SELECT count(*)::int FROM public.teia_members m WHERE m.teia_key = t.id::text),
         (SELECT left(coalesce(nullif(x.body, ''), 'mandou uma figurinha'), 90)
            FROM public.teia_messages x WHERE x.teia_key = t.id::text
            ORDER BY x.created_at DESC LIMIT 1),
         (SELECT coalesce(nullif(x.author, ''), 'Alguém') FROM public.teia_messages x
            WHERE x.teia_key = t.id::text ORDER BY x.created_at DESC LIMIT 1),
         (SELECT x.created_at FROM public.teia_messages x
            WHERE x.teia_key = t.id::text ORDER BY x.created_at DESC LIMIT 1),
         (SELECT count(*)::int FROM public.teia_messages x
            WHERE x.teia_key = t.id::text
              AND x.sender_id <> auth.uid()
              AND x.created_at > coalesce(
                    (SELECT v.visto_em FROM public.tribo_vista v
                      WHERE v.user_id = auth.uid() AND v.teia_key = t.id::text),
                    'epoch'::timestamptz))
  FROM public.teias t
  JOIN public.teia_members m ON m.teia_key = t.id::text AND m.user_id = auth.uid()
  WHERE auth.uid() IS NOT NULL AND t.kind = 'teia'
    AND (NOT t.is_test OR public.ve_contas_de_teste())
  ORDER BY 7 DESC NULLS LAST, t.created_at DESC
  LIMIT 100
$$;
REVOKE ALL ON FUNCTION public.minhas_tribos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.minhas_tribos() TO authenticated;
