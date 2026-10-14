CREATE OR REPLACE FUNCTION public.list_teias(_creator uuid DEFAULT NULL, _id bigint DEFAULT NULL)
RETURNS TABLE (id bigint, kind text, name text, mode text, category text, city text, place text, when_text text, creator_nickname text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.kind, t.name, t.mode, t.category, t.city, t.place, t.when_text, t.creator_nickname, t.created_at
  FROM public.teias t
  WHERE auth.uid() IS NOT NULL
    AND (_creator IS NULL OR t.created_by = _creator)
    AND (_id IS NULL OR t.id = _id)
  ORDER BY t.created_at DESC
  LIMIT 200
$$;
REVOKE ALL ON FUNCTION public.list_teias(uuid, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_teias(uuid, bigint) TO authenticated;
DROP POLICY IF EXISTS "Contas leem teias" ON public.teias;
CREATE POLICY "Criador e membros leem a teia" ON public.teias FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_teia_member(id::text, auth.uid()));