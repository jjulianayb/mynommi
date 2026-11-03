-- O cadastro prometia 600 letras para a história e 200 para a procura, mas o
-- banco ainda cortava em 140 (resto da 0000; a 0016 tentou subir para 280 com
-- ADD COLUMN IF NOT EXISTS, que não roda quando a coluna já existe). Quem
-- escrevia mais tomava "Não deu para guardar agora" no fim do cadastro.
-- Aqui o banco passa a aceitar o que o app já promete (Ju, 03/11/2026).
--
-- ROLLBACK (rodar à mão; cuidado: valores acima de 140 precisam caber antes):
--   UPDATE public.profiles SET about = left(about, 140) WHERE char_length(about) > 140;
--   UPDATE public.profiles SET looking_for = left(looking_for, 140) WHERE char_length(looking_for) > 140;
--   ALTER TABLE public.profiles DROP CONSTRAINT profiles_about_check;
--   ALTER TABLE public.profiles ADD CONSTRAINT profiles_about_check CHECK (char_length(about) <= 140);
--   ALTER TABLE public.profiles DROP CONSTRAINT profiles_looking_for_check;
--   ALTER TABLE public.profiles ADD CONSTRAINT profiles_looking_for_check CHECK (char_length(looking_for) <= 140);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_about_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_about_check CHECK (char_length(about) <= 600);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_looking_for_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_looking_for_check CHECK (char_length(looking_for) <= 200);
