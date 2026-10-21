-- Público da tribo (rótulo honesto, não trava de entrada) e remoção de quem não respeita o espaço.

ALTER TABLE public.teias
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'todos' CHECK (audience IN ('todos','mulheres'));

-- Quem criou a tribo, e a administração, podem remover alguém do grupo.
CREATE POLICY "Criadora remove da tribo" ON public.teia_members FOR DELETE TO authenticated
  USING (
    teia_key ~ '^[0-9]+$'
    AND (public.is_teia_creator(teia_key::bigint, auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  );

-- Para remover, é preciso enxergar a lista: quem criou e a administração veem os membros.
CREATE POLICY "Criadora e admin veem os membros" ON public.teia_members FOR SELECT TO authenticated
  USING (
    teia_key ~ '^[0-9]+$'
    AND (public.is_teia_creator(teia_key::bigint, auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  );

-- Quem foi removido não volta sozinho: fica registrado.
CREATE TABLE public.teia_removals (
  teia_id bigint NOT NULL REFERENCES public.teias(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  removed_by uuid NOT NULL,
  reason text NOT NULL DEFAULT '' CHECK (char_length(reason) <= 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (teia_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.teia_removals TO authenticated;
GRANT ALL ON public.teia_removals TO service_role;
ALTER TABLE public.teia_removals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver remoções da minha tribo" ON public.teia_removals FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_teia_creator(teia_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Registrar remoção" ON public.teia_removals FOR INSERT TO authenticated
  WITH CHECK (removed_by = auth.uid() AND (public.is_teia_creator(teia_id, auth.uid()) OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Desfazer remoção" ON public.teia_removals FOR DELETE TO authenticated
  USING (public.is_teia_creator(teia_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Quem foi removido não entra de novo.
DROP POLICY IF EXISTS "Entrar numa tribo" ON public.teia_members;
DROP POLICY IF EXISTS "Entrar numa teia" ON public.teia_members;
CREATE POLICY "Entrar numa tribo" ON public.teia_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND length(teia_key) <= 40 AND length(nickname) <= 40
    AND NOT EXISTS (
      SELECT 1 FROM public.teia_removals r
      WHERE r.user_id = auth.uid() AND teia_key ~ '^[0-9]+$' AND r.teia_id = teia_key::bigint
    ));

-- A listagem passa a dizer de quem é o espaço.
DROP FUNCTION IF EXISTS public.list_teias(uuid, bigint);
CREATE FUNCTION public.list_teias(_creator uuid DEFAULT NULL, _id bigint DEFAULT NULL)
RETURNS TABLE (id bigint, kind text, name text, mode text, category text, city text, place text, when_text text,
               creator_nickname text, created_at timestamptz, starts_at timestamptz, capacity integer,
               going_count integer, i_am_going boolean, about text, rule text, official boolean,
               member_count integer, i_am_member boolean, cover_path text, audience text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.kind, t.name, t.mode, t.category, t.city, t.place, t.when_text,
         CASE WHEN t.official THEN 'nommi' ELSE t.creator_nickname END,
         t.created_at, t.starts_at, t.capacity,
         (SELECT count(*)::int FROM public.teia_rsvps r WHERE r.teia_id = t.id),
         EXISTS (SELECT 1 FROM public.teia_rsvps r WHERE r.teia_id = t.id AND r.user_id = auth.uid()),
         t.about, t.rule, t.official,
         (SELECT count(*)::int FROM public.teia_members m WHERE m.teia_key = t.id::text),
         EXISTS (SELECT 1 FROM public.teia_members m WHERE m.teia_key = t.id::text AND m.user_id = auth.uid()),
         t.cover_path, t.audience
  FROM public.teias t
  WHERE auth.uid() IS NOT NULL
    AND (t.official OR NOT public.is_blocked_between(auth.uid(), t.created_by))
    AND (_creator IS NULL OR t.created_by = _creator)
    AND (_id IS NULL OR t.id = _id)
  ORDER BY t.official DESC, t.created_at DESC
  LIMIT 200
$$;
REVOKE ALL ON FUNCTION public.list_teias(uuid, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_teias(uuid, bigint) TO authenticated;
