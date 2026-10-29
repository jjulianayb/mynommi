-- O Início mostrava rolês de exemplo da apresentação no lugar mais nobre da
-- tela. Decisão da Ju: ali é o álbum da pessoa. Os rolês que ela foi, com a
-- última foto de cada um e com quem ela foi, e ela guarda a lembrança com uma
-- frase própria ("fui com a tribo tal").

CREATE TABLE public.lembrancas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  teia_id bigint NOT NULL,
  path text NOT NULL DEFAULT '' CHECK (char_length(path) <= 200),
  legenda text NOT NULL DEFAULT '' CHECK (char_length(legenda) <= 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, teia_id)
);
CREATE INDEX lembrancas_idx ON public.lembrancas (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lembrancas TO authenticated;
GRANT ALL ON public.lembrancas TO service_role;
ALTER TABLE public.lembrancas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Minhas lembrancas" ON public.lembrancas FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Guardo a minha" ON public.lembrancas FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Mudo a minha" ON public.lembrancas FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Apago a minha" ON public.lembrancas FOR DELETE TO authenticated
  USING (user_id = auth.uid());

/**
 * Os rolês que eu fui: presença declarada, ou "quero ir" num rolê que já
 * passou. A foto é a última imagem publicada naquele rolê, a não ser que eu
 * tenha guardado outra. "Com quem" sai de quem mais declarou presença.
 */
CREATE OR REPLACE FUNCTION public.meus_roles_vividos()
RETURNS TABLE (
  teia_id bigint, nome text, quando timestamptz, cidade text,
  foto text, com_quem text, legenda text, guardada boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH meus AS (
    SELECT DISTINCT t.id, t.name, coalesce(t.starts_at, t.created_at) AS quando, t.city
    FROM public.teias t
    WHERE t.kind = 'role'
      AND (NOT t.is_test OR public.ve_contas_de_teste())
      AND (
        EXISTS (SELECT 1 FROM public.attendances a
                 WHERE a.teia_id = t.id AND a.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.teia_rsvps r
                 WHERE r.teia_id = t.id AND r.user_id = auth.uid()
                   AND coalesce(t.starts_at, t.created_at) < now())
      )
  )
  SELECT m.id, m.name, m.quando, m.city,
         coalesce(l.path, (
           SELECT pm.path FROM public.post_media pm
            JOIN public.posts p ON p.id = pm.post_id
            WHERE p.teia_id = m.id AND pm.kind = 'image'
            ORDER BY p.created_at DESC LIMIT 1), ''),
         (SELECT string_agg(x.nome, ', ') FROM (
            SELECT coalesce(nullif(pr.nickname, ''), 'uma amizade') AS nome
              FROM public.attendances a
              JOIN public.profiles pr ON pr.id = a.user_id
             WHERE a.teia_id = m.id AND a.user_id <> auth.uid()
               AND (NOT pr.is_test OR public.ve_contas_de_teste())
             ORDER BY a.declared_at LIMIT 3) x),
         coalesce(l.legenda, ''),
         l.id IS NOT NULL
  FROM meus m
  LEFT JOIN public.lembrancas l ON l.user_id = auth.uid() AND l.teia_id = m.id
  WHERE auth.uid() IS NOT NULL
  ORDER BY m.quando DESC
  LIMIT 40
$$;
REVOKE ALL ON FUNCTION public.meus_roles_vividos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meus_roles_vividos() TO authenticated;

CREATE OR REPLACE FUNCTION public.guardar_lembranca(_teia bigint, _path text, _legenda text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.lembrancas (user_id, teia_id, path, legenda)
  SELECT auth.uid(), _teia, left(coalesce(_path, ''), 200), left(coalesce(_legenda, ''), 120)
  WHERE auth.uid() IS NOT NULL
  ON CONFLICT (user_id, teia_id)
  DO UPDATE SET path = excluded.path, legenda = excluded.legenda
$$;
REVOKE ALL ON FUNCTION public.guardar_lembranca(bigint, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guardar_lembranca(bigint, text, text) TO authenticated;

-- Tabela nova com dado de pessoa entra nas duas funções, a que exporta e a que
-- apaga, no mesmo commit. Aqui entram tribo_vista (0036) e lembrancas.
-- O corpo completo das duas está aplicado em produção; o que muda é só a
-- inclusão destas duas tabelas.
