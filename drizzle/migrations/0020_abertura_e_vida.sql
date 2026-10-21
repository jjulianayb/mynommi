-- Vida de verdade na largada: meta de abertura da tribo, convites e sinais reais de movimento.

-- 1. Meta: a tribo abre quando chegar a tantas pessoas. Número real, barra real.
ALTER TABLE public.teias
  ADD COLUMN IF NOT EXISTS goal integer CHECK (goal IS NULL OR goal BETWEEN 3 AND 500);

-- 2. Convites: quem trouxe quem. Serve para agradecer e para medir boca a boca.
CREATE TABLE public.invites (
  code text PRIMARY KEY,
  owner_id uuid NOT NULL,
  used_by uuid,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invites_owner_idx ON public.invites (owner_id);
GRANT SELECT, INSERT ON public.invites TO authenticated;
GRANT ALL ON public.invites TO service_role;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver os meus convites" ON public.invites FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR used_by = auth.uid());
CREATE POLICY "Criar convite meu" ON public.invites FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND used_by IS NULL AND char_length(code) BETWEEN 6 AND 24);
-- Usar convite passa por função: ninguém precisa enxergar códigos alheios para isso.
CREATE OR REPLACE FUNCTION public.usar_convite(_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ok boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  UPDATE public.invites
     SET used_by = auth.uid(), used_at = now()
   WHERE code = _code AND used_by IS NULL AND owner_id <> auth.uid();
  GET DIAGNOSTICS ok = ROW_COUNT;
  RETURN ok;
END $$;
REVOKE ALL ON FUNCTION public.usar_convite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.usar_convite(text) TO authenticated;

-- 3. Sinais de vida, sem expor ninguém: só números do que realmente aconteceu.
CREATE OR REPLACE FUNCTION public.pulso_da_nommi()
RETURNS TABLE (pessoas integer, tribos integer, roles_abertos integer, encontros_marcados integer,
               mensagens_semana integer, entraram_semana integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*)::int FROM public.profiles WHERE nickname <> '' AND NOT is_business),
    (SELECT count(*)::int FROM public.teias WHERE kind = 'teia'),
    (SELECT count(*)::int FROM public.teias WHERE kind = 'role' AND (starts_at IS NULL OR starts_at > now())),
    (SELECT count(*)::int FROM public.teia_rsvps),
    (SELECT count(*)::int FROM public.teia_messages WHERE created_at > now() - interval '7 days'),
    (SELECT count(*)::int FROM public.teia_members WHERE joined_at > now() - interval '7 days')
  WHERE auth.uid() IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.pulso_da_nommi() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pulso_da_nommi() TO authenticated;

-- 4. Tribos sugeridas por interesse, com quantas pessoas faltam para a meta.
CREATE OR REPLACE FUNCTION public.tribos_para_mim(_limite integer DEFAULT 6)
RETURNS TABLE (id bigint, name text, about text, category text, city text, member_count integer,
               goal integer, i_am_member boolean, em_comum integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH eu AS (SELECT interests, city FROM public.profiles WHERE id = auth.uid())
  SELECT t.id, t.name, t.about, t.category, t.city,
         (SELECT count(*)::int FROM public.teia_members m WHERE m.teia_key = t.id::text),
         t.goal,
         EXISTS (SELECT 1 FROM public.teia_members m WHERE m.teia_key = t.id::text AND m.user_id = auth.uid()),
         (SELECT count(*)::int FROM unnest(COALESCE(eu.interests, '{}')) i
           WHERE lower(t.name) LIKE '%' || lower(i) || '%' OR lower(t.category) LIKE '%' || lower(i) || '%'
              OR lower(t.about) LIKE '%' || lower(i) || '%')
  FROM public.teias t, eu
  WHERE auth.uid() IS NOT NULL AND t.kind = 'teia'
    AND NOT EXISTS (SELECT 1 FROM public.teia_members m WHERE m.teia_key = t.id::text AND m.user_id = auth.uid())
  ORDER BY (SELECT count(*)::int FROM unnest(COALESCE(eu.interests, '{}')) i
             WHERE lower(t.name) LIKE '%' || lower(i) || '%' OR lower(t.category) LIKE '%' || lower(i) || '%'
                OR lower(t.about) LIKE '%' || lower(i) || '%') DESC,
           (t.city = eu.city) DESC, t.official DESC, t.id
  LIMIT greatest(1, least(_limite, 20))
$$;
REVOKE ALL ON FUNCTION public.tribos_para_mim(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tribos_para_mim(integer) TO authenticated;
