-- Tribo do Pippo: conta-sistema "Pippo" (sem login, invisível) + tribo oficial + entrada automática
-- só para contas NOVAS. Decisão de produto da Ju (02/11), via a coordenação do projeto.
--
-- ROLLBACK (documentado; nada disto altera dados de pessoas):
--   DROP TRIGGER IF EXISTS profiles_entra_tribo_do_pippo ON public.profiles;
--   DROP FUNCTION IF EXISTS public.entra_na_tribo_do_pippo();
--   DELETE FROM public.posts WHERE author_id = 'a0000000-0000-4000-8000-0000000000f1';
--   DELETE FROM public.teia_members WHERE teia_key = (SELECT id::text FROM public.teias WHERE created_by = 'a0000000-0000-4000-8000-0000000000f1');
--   DELETE FROM public.teias WHERE created_by = 'a0000000-0000-4000-8000-0000000000f1';
--   DELETE FROM auth.users WHERE id = 'a0000000-0000-4000-8000-0000000000f1';
--
-- Invisibilidade: o perfil do Pippo é is_test=true, então some de busca, Descobrir, Radar, KPIs
-- (pulso_da_nommi) e da leitura de perfil por quem não é admin (0026, 0031). Não tem email que
-- entre, nem senha, nem confirmação: ninguém consegue logar nele.

INSERT INTO auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
VALUES ('a0000000-0000-4000-8000-0000000000f1', 'authenticated', 'authenticated',
        'pippo@sistema.nommi.invalid', '{"nickname":"Pippo"}'::jsonb, now(), now())
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles
   SET nickname = 'Pippo', is_test = true, profile_mode = 'privado'
 WHERE id = 'a0000000-0000-4000-8000-0000000000f1';

-- O Pippo não precisa de Pippins nem de presente de boas-vindas.
DELETE FROM public.credit_ledger WHERE user_id = 'a0000000-0000-4000-8000-0000000000f1';
DELETE FROM public.credit_accounts WHERE user_id = 'a0000000-0000-4000-8000-0000000000f1';

INSERT INTO public.teias (kind, name, mode, category, city, created_by, creator_nickname, about, rule,
                          official, audience, who_posts, entrada, is_test)
SELECT 'teia', 'Tribo do Pippo', 'Online', 'Papo', '', 'a0000000-0000-4000-8000-0000000000f1', 'nommi',
       'A tribo do Pippo: jogos, quizzes e desafios para você conhecer a galera. O Pippo conta o que está rolando.',
       'Aqui é papo leve e respeitoso.',
       true, 'todos', 'criadora', 'aberta', true
WHERE NOT EXISTS (SELECT 1 FROM public.teias WHERE created_by = 'a0000000-0000-4000-8000-0000000000f1');
-- Entra como teste só para passar a regra "criar tribo é Pro" (o Pippo é conta-sistema); depois vira pública.
UPDATE public.teias SET is_test = false WHERE created_by = 'a0000000-0000-4000-8000-0000000000f1';

-- Só contas NOVAS entram sozinhas (nunca retroativo). Saem pelo "Sair da tribo" de sempre.
CREATE OR REPLACE FUNCTION public.entra_na_tribo_do_pippo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tribo bigint; empresa boolean;
BEGIN
  IF coalesce(NEW.is_test, false) OR coalesce(NEW.is_business, false) THEN RETURN NEW; END IF;
  SELECT coalesce((u.raw_user_meta_data->>'is_business')::boolean, false) INTO empresa
    FROM auth.users u WHERE u.id = NEW.id;
  IF coalesce(empresa, false) THEN RETURN NEW; END IF;
  SELECT t.id INTO tribo FROM public.teias t
   WHERE t.created_by = 'a0000000-0000-4000-8000-0000000000f1' AND t.official LIMIT 1;
  IF tribo IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.teia_members(teia_key, user_id, nickname)
    VALUES (tribo::text, NEW.id, left(coalesce(NEW.nickname, ''), 30))
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.entra_na_tribo_do_pippo() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS profiles_entra_tribo_do_pippo ON public.profiles;
CREATE TRIGGER profiles_entra_tribo_do_pippo AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.entra_na_tribo_do_pippo();
