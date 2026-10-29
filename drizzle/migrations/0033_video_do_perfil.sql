-- O vídeo do perfil: a pessoa falando o que procura, e os amigos falando dela.
-- É a peça que transforma perfil em gente. Por isso tem dono, tem aprovação
-- e tem como tirar do ar — vídeo de alguém sobre você não entra sem você deixar.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS video_path text NOT NULL DEFAULT '' CHECK (char_length(video_path) <= 200);

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (nickname, city, interests, about, profile_mode, avatar_url, goals, visibility,
              wall_approval, show_counts, cover_path, background_path, places, instagram,
              looking_for, is_business, updated_at,
              cover_x, cover_y, avatar_x, avatar_y, avatar_figura, video_path) ON public.profiles TO authenticated;

INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', false)
  ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Enviar meu vídeo" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Apagar meu arquivo de vídeo" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Ver vídeo de perfil" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'videos');

-- Vídeos de amigos sobre uma pessoa. Só amizade grava, e o dono decide se entra.
CREATE TABLE public.videos_amigos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dono uuid NOT NULL,
  de uuid NOT NULL,
  path text NOT NULL CHECK (char_length(path) BETWEEN 5 AND 200),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'no_ar', 'recusado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (dono <> de)
);
CREATE INDEX videos_amigos_idx ON public.videos_amigos (dono, status, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.videos_amigos TO authenticated;
GRANT UPDATE (status) ON public.videos_amigos TO authenticated;
GRANT ALL ON public.videos_amigos TO service_role;
ALTER TABLE public.videos_amigos ENABLE ROW LEVEL SECURITY;

-- Quem vê: o dono (tudo), quem gravou (o seu), e os outros só o que está no ar.
CREATE POLICY "Ver vídeos de amigos" ON public.videos_amigos FOR SELECT TO authenticated
  USING (
    dono = auth.uid() OR de = auth.uid()
    OR (status = 'no_ar' AND EXISTS (
          SELECT 1 FROM public.profiles p WHERE p.id = dono AND p.profile_mode = 'publico'
            AND NOT public.is_blocked_between(auth.uid(), p.id)
            AND (NOT p.is_test OR public.ve_contas_de_teste())))
  );
CREATE POLICY "Gravar sobre uma amizade" ON public.videos_amigos FOR INSERT TO authenticated
  WITH CHECK (de = auth.uid() AND public.sao_amigos(auth.uid(), dono)
              AND path LIKE auth.uid()::text || '/%');
-- Só o dono decide o que fica no ar na página dele.
CREATE POLICY "Dono decide o que entra" ON public.videos_amigos FOR UPDATE TO authenticated
  USING (dono = auth.uid()) WITH CHECK (dono = auth.uid());
CREATE POLICY "Tirar o vídeo" ON public.videos_amigos FOR DELETE TO authenticated
  USING (dono = auth.uid() OR de = auth.uid());

/** Os vídeos de uma página, com o nome de quem gravou. */
CREATE OR REPLACE FUNCTION public.videos_da_pagina(_user uuid)
RETURNS TABLE (id uuid, de uuid, quem text, path text, status text, quando timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.id, v.de, coalesce(nullif(p.nickname, ''), 'Uma amizade'), v.path, v.status, v.created_at
  FROM public.videos_amigos v
  JOIN public.profiles p ON p.id = v.de
  WHERE v.dono = _user AND auth.uid() IS NOT NULL
    AND NOT public.is_blocked_between(auth.uid(), v.dono)
    AND (v.dono = auth.uid() OR v.de = auth.uid() OR v.status = 'no_ar')
  ORDER BY v.created_at DESC
  LIMIT 20
$$;
REVOKE ALL ON FUNCTION public.videos_da_pagina(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.videos_da_pagina(uuid) TO authenticated;

/** Avisa a pessoa que alguém gravou um vídeo sobre ela. */
CREATE OR REPLACE FUNCTION public.aviso_video_amigo() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE quem text;
BEGIN
  SELECT coalesce(nullif(nickname, ''), 'Uma amizade') INTO quem FROM public.profiles WHERE id = NEW.de;
  PERFORM public.avisar(NEW.dono, 'mural', NEW.de, NULL, NULL,
    quem || ' gravou um vídeo falando de você. Veja se quer deixar na sua página');
  RETURN NEW;
END $$;
CREATE TRIGGER video_amigo_avisa AFTER INSERT ON public.videos_amigos
  FOR EACH ROW EXECUTE FUNCTION public.aviso_video_amigo();
