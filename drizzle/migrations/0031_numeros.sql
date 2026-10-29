-- Os números da nommi, para saber se a primeira turma funcionou.
-- Guardamos só o DIA em que cada pessoa abriu o app: não é rastreamento de tela,
-- de clique nem de lugar. É o mínimo para responder "quantas voltaram".

CREATE TABLE public.acessos (
  user_id uuid NOT NULL,
  dia date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  PRIMARY KEY (user_id, dia)
);
CREATE INDEX acessos_dia_idx ON public.acessos (dia);
GRANT SELECT, INSERT ON public.acessos TO authenticated;
GRANT ALL ON public.acessos TO service_role;
ALTER TABLE public.acessos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vejo os meus acessos" ON public.acessos FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Marcar que abri hoje" ON public.acessos FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

/** Uma linha por pessoa por dia. Chamar de novo no mesmo dia não faz nada. */
CREATE OR REPLACE FUNCTION public.registrar_acesso()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.acessos (user_id)
  SELECT auth.uid() WHERE auth.uid() IS NOT NULL
  ON CONFLICT DO NOTHING
$$;
REVOKE ALL ON FUNCTION public.registrar_acesso() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_acesso() TO authenticated;

/**
 * O painel. Conta de teste fica de fora de tudo: número com gente inventada
 * dentro é número que mente para quem decide.
 */
CREATE OR REPLACE FUNCTION public.painel_de_numeros()
RETURNS TABLE (
  cadastrados integer, entraram_semana integer,
  ativos_semana integer, ativos_mes integer,
  voltaram integer, dias_por_pessoa numeric,
  com_foto integer, com_interesses integer,
  amizades integer, amizades_semana integer,
  conversas integer, tribos_vivas integer,
  roles_futuros integer, stories_semana integer
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH gente AS (
    SELECT id, avatar_url, interests, created_at FROM public.profiles
    WHERE NOT is_business AND NOT is_test AND nickname <> ''
  ),
  ac AS (SELECT a.user_id, a.dia FROM public.acessos a WHERE a.user_id IN (SELECT id FROM gente))
  SELECT
    (SELECT count(*)::int FROM gente),
    (SELECT count(*)::int FROM gente WHERE created_at > now() - interval '7 days'),
    (SELECT count(DISTINCT user_id)::int FROM ac WHERE dia > current_date - 7),
    (SELECT count(DISTINCT user_id)::int FROM ac WHERE dia > current_date - 30),
    (SELECT count(*)::int FROM (SELECT user_id FROM ac GROUP BY user_id HAVING count(*) > 1) v),
    (SELECT coalesce(round(avg(d), 1), 0) FROM
      (SELECT count(*)::numeric AS d FROM ac WHERE dia > current_date - 7 GROUP BY user_id) x),
    (SELECT count(*)::int FROM gente WHERE avatar_url <> ''),
    (SELECT count(*)::int FROM gente WHERE coalesce(cardinality(interests), 0) > 0),
    (SELECT count(*)::int FROM public.connections c WHERE c.status = 'aceita'
       AND c.requester_id IN (SELECT id FROM gente) AND c.addressee_id IN (SELECT id FROM gente)),
    (SELECT count(*)::int FROM public.connections c WHERE c.status = 'aceita'
       AND c.accepted_at > now() - interval '7 days'
       AND c.requester_id IN (SELECT id FROM gente) AND c.addressee_id IN (SELECT id FROM gente)),
    (SELECT count(*)::int FROM (
       SELECT least(sender_id, recipient_id) a, greatest(sender_id, recipient_id) b
       FROM public.direct_messages GROUP BY 1, 2) p),
    (SELECT count(*)::int FROM public.teias t
      WHERE t.kind = 'teia' AND NOT t.is_test
        AND (SELECT count(*) FROM public.teia_members m WHERE m.teia_key = t.id::text) > 1),
    (SELECT count(*)::int FROM public.teias t
      WHERE t.kind = 'role' AND NOT t.is_test AND t.starts_at > now()),
    (SELECT count(*)::int FROM public.stories s WHERE s.created_at > now() - interval '7 days')
  WHERE public.has_role(auth.uid(), 'admin')
$$;
REVOKE ALL ON FUNCTION public.painel_de_numeros() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.painel_de_numeros() TO authenticated;

/** Quantas pessoas abriram o app em cada um dos últimos 30 dias. */
CREATE OR REPLACE FUNCTION public.acessos_por_dia()
RETURNS TABLE (dia date, quantas integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d::date, (
    SELECT count(DISTINCT a.user_id)::int FROM public.acessos a
    JOIN public.profiles p ON p.id = a.user_id AND NOT p.is_test AND NOT p.is_business
    WHERE a.dia = d::date
  )
  FROM generate_series(current_date - 29, current_date, interval '1 day') d
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY 1
$$;
REVOKE ALL ON FUNCTION public.acessos_por_dia() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acessos_por_dia() TO authenticated;
