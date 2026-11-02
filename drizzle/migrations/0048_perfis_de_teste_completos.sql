-- Perfis de teste completos: a Marina completa, amiga da Rafa, da Lu e da
-- Camila, todas completas também.
--
-- Decisão da Ju (01/11): as quatro já existiam como contas de teste (is_test)
-- com apelido, foto, sobre, interesses, lugares, procura e cidade. Faltava a
-- capa para bater 100% no medidor de página completa, e faltava a amizade
-- Marina–Camila para a Marina ficar amiga das três.
--
-- São contas de teste: invisíveis para quem não é admin (0026), sem presente
-- de boas-vindas, sem vaga de embaixadora. Apagar é apagar a conta no auth,
-- que leva tudo em cascata.

UPDATE public.profiles SET cover_path = 'teia-verde', updated_at = now()
  WHERE id = 'a0000000-0000-4000-8000-000000000001' AND cover_path = '';
UPDATE public.profiles SET cover_path = 'noite', updated_at = now()
  WHERE id = 'a0000000-0000-4000-8000-000000000002' AND cover_path = '';
UPDATE public.profiles SET cover_path = 'amanhecer', updated_at = now()
  WHERE id = 'a0000000-0000-4000-8000-000000000003' AND cover_path = '';
UPDATE public.profiles SET cover_path = 'cerrado', updated_at = now()
  WHERE id = 'a0000000-0000-4000-8000-000000000004' AND cover_path = '';

INSERT INTO public.connections (requester_id, addressee_id, status, accepted_at)
VALUES ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004', 'aceita', now())
ON CONFLICT DO NOTHING;
