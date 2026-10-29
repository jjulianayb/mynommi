-- O bonequinho de quem não põe foto. É escolha de desenho, não cadastro de gênero:
-- o app não usa este campo para filtrar ninguém nem para combinar.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_figura text NOT NULL DEFAULT 'neutro'
    CHECK (avatar_figura IN ('mulher', 'homem', 'neutro'));

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (nickname, city, interests, about, profile_mode, avatar_url, goals, visibility,
              wall_approval, show_counts, cover_path, background_path, places, instagram,
              looking_for, is_business, updated_at,
              cover_x, cover_y, avatar_x, avatar_y, avatar_figura) ON public.profiles TO authenticated;

-- pagina_pessoal e pessoas_para_combinar devolvem avatar_figura (aplicadas na mesma leva).
