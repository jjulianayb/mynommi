CREATE TABLE public.teias (
  id bigint GENERATED ALWAYS AS IDENTITY (START WITH 100000) PRIMARY KEY,
  kind text NOT NULL DEFAULT 'teia' CHECK (kind IN ('teia','role')),
  name text NOT NULL CHECK (char_length(name) BETWEEN 3 AND 60),
  mode text NOT NULL DEFAULT 'Presencial' CHECK (mode IN ('Presencial','Online','Híbrido')),
  category text CHECK (category IS NULL OR char_length(category) <= 40),
  city text NOT NULL DEFAULT '' CHECK (char_length(city) <= 80),
  place text NOT NULL DEFAULT '' CHECK (char_length(place) <= 80),
  when_text text NOT NULL DEFAULT '' CHECK (char_length(when_text) <= 60),
  created_by uuid NOT NULL,
  creator_nickname text NOT NULL DEFAULT '' CHECK (char_length(creator_nickname) <= 40),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teias TO authenticated;
GRANT ALL ON public.teias TO service_role;
ALTER TABLE public.teias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contas leem teias" ON public.teias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Cria a própria teia" ON public.teias FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Edita a própria teia" ON public.teias FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Apaga a própria teia" ON public.teias FOR DELETE TO authenticated USING (created_by = auth.uid());
CREATE INDEX teias_created_idx ON public.teias (created_at DESC);