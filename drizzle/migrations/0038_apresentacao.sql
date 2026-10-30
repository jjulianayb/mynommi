-- A apresentação: o pedacinho entre "criei a conta" e "e agora?".
-- A testadora saiu do cadastro sem entender como encontraria alguém.
--
-- Duas respostas novas, e a marca de quem já passou por isso.
-- "pulou" conta como visto: ninguém é cobrado duas vezes pela mesma coisa.
--
-- Privacidade, decidida aqui e dita na tela: história, o que procura e o rolê
-- que topa aparecem na página da pessoa. O rolê que ela NÃO topa não aparece
-- para ninguém — serve só para a nommi parar de sugerir o que ela não gosta.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS topa text NOT NULL DEFAULT '' CHECK (char_length(topa) <= 200),
  ADD COLUMN IF NOT EXISTS nao_topa text NOT NULL DEFAULT '' CHECK (char_length(nao_topa) <= 200),
  ADD COLUMN IF NOT EXISTS apresentacao text NOT NULL DEFAULT 'pendente'
    CHECK (apresentacao IN ('pendente', 'pulou', 'feita'));

-- Coluna nova em profiles precisa entrar no GRANT por coluna, senão não salva
-- (a permissão por tabela abriria person_verified junto).
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (nickname, city, interests, about, profile_mode, avatar_url, goals, visibility,
              wall_approval, show_counts, cover_path, background_path, places, instagram,
              looking_for, is_business, updated_at,
              cover_x, cover_y, avatar_x, avatar_y, avatar_figura, video_path,
              nascimento, topa, nao_topa, apresentacao) ON public.profiles TO authenticated;
