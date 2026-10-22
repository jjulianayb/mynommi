-- Moderação: denúncia que ninguém lê não protege ninguém.

CREATE OR REPLACE FUNCTION public.fila_de_moderacao(_status text DEFAULT 'aberta')
RETURNS TABLE (id uuid, reason text, note text, status text, created_at timestamptz,
               reporter_id uuid, reporter text, target_user uuid, target_nome text,
               target_teia bigint, teia_nome text, denuncias_contra integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.reason, r.note, r.status, r.created_at,
         r.reporter_id, COALESCE(pr.nickname, 'nommi'),
         r.target_user, COALESCE(pt.nickname, ''),
         r.target_teia, COALESCE(t.name, ''),
         CASE WHEN r.target_user IS NULL THEN 0
              ELSE (SELECT count(*)::int FROM public.reports o WHERE o.target_user = r.target_user) END
  FROM public.reports r
  LEFT JOIN public.profiles pr ON pr.id = r.reporter_id
  LEFT JOIN public.profiles pt ON pt.id = r.target_user
  LEFT JOIN public.teias t ON t.id = r.target_teia
  WHERE public.has_role(auth.uid(), 'admin') AND (_status = 'todas' OR r.status = _status)
  ORDER BY r.created_at DESC
  LIMIT 200
$$;
REVOKE ALL ON FUNCTION public.fila_de_moderacao(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fila_de_moderacao(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.resumo_da_moderacao()
RETURNS TABLE (abertas integer, analisadas integer, arquivadas integer, pessoas_denunciadas integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (SELECT count(*)::int FROM public.reports WHERE status = 'aberta'),
         (SELECT count(*)::int FROM public.reports WHERE status = 'analisada'),
         (SELECT count(*)::int FROM public.reports WHERE status = 'arquivada'),
         (SELECT count(DISTINCT target_user)::int FROM public.reports WHERE target_user IS NOT NULL)
  WHERE public.has_role(auth.uid(), 'admin')
$$;
REVOKE ALL ON FUNCTION public.resumo_da_moderacao() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resumo_da_moderacao() TO authenticated;

CREATE OR REPLACE FUNCTION public.moderar_post(_post uuid, _remover boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RETURN false; END IF;
  UPDATE public.posts SET status = CASE WHEN _remover THEN 'removido' ELSE 'publicado' END WHERE id = _post;
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.moderar_post(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderar_post(uuid, boolean) TO authenticated;
