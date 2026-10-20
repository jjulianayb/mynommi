-- Parte 1 da rodada 2: perfil guardado na nuvem, rolês com data/vagas, "Quero ir", bloqueio e denúncia.

-- 1. Perfil: objetivos, quem vê o quê e aprovação do mural deixam de viver só no aparelho.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS goals text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS visibility jsonb NOT NULL DEFAULT '{"fotos":"todos","roles":"todos","teia":"todos"}'::jsonb,
  ADD COLUMN IF NOT EXISTS wall_approval boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_goals_limit CHECK (cardinality(goals) <= 6);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_visibility_valid CHECK (
  jsonb_typeof(visibility) = 'object'
  AND (visibility->>'fotos') IN ('todos','amizades','so-eu')
  AND (visibility->>'roles') IN ('todos','amizades','so-eu')
  AND (visibility->>'teia') IN ('todos','amizades','so-eu')
);

-- 2. Rolês: data real e número de vagas.
ALTER TABLE public.teias
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS capacity integer;
ALTER TABLE public.teias ADD CONSTRAINT teias_capacity_range CHECK (capacity IS NULL OR capacity BETWEEN 2 AND 100);

-- 3. Bloqueios (valem nos dois sentidos).
CREATE TABLE public.blocks (
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO service_role;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver meus bloqueios" ON public.blocks FOR SELECT TO authenticated USING (blocker_id = auth.uid());
CREATE POLICY "Bloquear alguém" ON public.blocks FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid());
CREATE POLICY "Desbloquear" ON public.blocks FOR DELETE TO authenticated USING (blocker_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_blocked_between(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.blocks WHERE (blocker_id = _a AND blocked_id = _b) OR (blocker_id = _b AND blocked_id = _a))
$$;
REVOKE ALL ON FUNCTION public.is_blocked_between(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_blocked_between(uuid, uuid) TO authenticated;

-- Quem bloqueou (ou foi bloqueado) não aparece nos perfis nem pede conexão.
DROP POLICY IF EXISTS "Ver perfis públicos ou o próprio" ON public.profiles;
CREATE POLICY "Ver perfis públicos ou o próprio" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR (profile_mode = 'publico' AND NOT public.is_blocked_between(auth.uid(), id)));
DROP POLICY IF EXISTS "Pedir conexão" ON public.connections;
CREATE POLICY "Pedir conexão" ON public.connections FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid() AND status = 'pendente' AND NOT public.is_blocked_between(requester_id, addressee_id));

-- 4. "Quero ir": intenção de ir a um rolê, respeitando as vagas.
CREATE TABLE public.teia_rsvps (
  teia_id bigint NOT NULL REFERENCES public.teias(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (teia_id, user_id)
);
CREATE INDEX teia_rsvps_user_idx ON public.teia_rsvps (user_id);
GRANT SELECT, INSERT, DELETE ON public.teia_rsvps TO authenticated;
GRANT ALL ON public.teia_rsvps TO service_role;
ALTER TABLE public.teia_rsvps ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_teia_creator(_teia bigint, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.teias WHERE id = _teia AND created_by = _user)
$$;
REVOKE ALL ON FUNCTION public.is_teia_creator(bigint, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_teia_creator(bigint, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.teia_has_room(_teia bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teias t WHERE t.id = _teia AND t.kind = 'role'
      AND (t.starts_at IS NULL OR t.starts_at > now())
      AND (t.capacity IS NULL OR (SELECT count(*) FROM public.teia_rsvps r WHERE r.teia_id = t.id) < t.capacity)
      AND NOT public.is_blocked_between(auth.uid(), t.created_by)
  )
$$;
REVOKE ALL ON FUNCTION public.teia_has_room(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teia_has_room(bigint) TO authenticated;

CREATE POLICY "Ver meu Quero ir ou o do meu rolê" ON public.teia_rsvps FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_teia_creator(teia_id, auth.uid()));
CREATE POLICY "Dizer Quero ir" ON public.teia_rsvps FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.teia_has_room(teia_id));
CREATE POLICY "Desistir do rolê" ON public.teia_rsvps FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 5. Listagem passa a trazer data, vagas, quantos vão e se eu vou.
DROP FUNCTION IF EXISTS public.list_teias(uuid, bigint);
CREATE FUNCTION public.list_teias(_creator uuid DEFAULT NULL, _id bigint DEFAULT NULL)
RETURNS TABLE (id bigint, kind text, name text, mode text, category text, city text, place text, when_text text, creator_nickname text, created_at timestamptz,
               starts_at timestamptz, capacity integer, going_count integer, i_am_going boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.kind, t.name, t.mode, t.category, t.city, t.place, t.when_text, t.creator_nickname, t.created_at,
         t.starts_at, t.capacity,
         (SELECT count(*)::int FROM public.teia_rsvps r WHERE r.teia_id = t.id),
         EXISTS (SELECT 1 FROM public.teia_rsvps r WHERE r.teia_id = t.id AND r.user_id = auth.uid())
  FROM public.teias t
  WHERE auth.uid() IS NOT NULL
    AND NOT public.is_blocked_between(auth.uid(), t.created_by)
    AND (_creator IS NULL OR t.created_by = _creator)
    AND (_id IS NULL OR t.id = _id)
  ORDER BY t.created_at DESC
  LIMIT 200
$$;
REVOKE ALL ON FUNCTION public.list_teias(uuid, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_teias(uuid, bigint) TO authenticated;

-- 6. Denúncias: qualquer conta denuncia; só admin lê todas.
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  target_user uuid,
  target_teia bigint,
  reason text NOT NULL CHECK (reason IN ('assedio','golpe','falso','inseguro','outro')),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 500),
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','analisada','arquivada')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (target_user IS NOT NULL OR target_teia IS NOT NULL),
  CHECK (target_user IS NULL OR target_user <> reporter_id)
);
CREATE INDEX reports_status_idx ON public.reports (status, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Denunciar" ON public.reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid() AND status = 'aberta');
CREATE POLICY "Ver minhas denúncias" ON public.reports FOR SELECT TO authenticated USING (reporter_id = auth.uid());
CREATE POLICY "Admin vê denúncias" ON public.reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin trata denúncias" ON public.reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
