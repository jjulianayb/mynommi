-- ROLLBACK: restaurar handle_new_user da 0049; restaurar pippo_recebe_quem_chega
-- da definicao anterior. Nao reverter mensagens nem perfis de pessoas.
-- Corrige somente criacoes futuras. Nao altera creditos, papeis ou contas existentes.
BEGIN;
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  insert into public.profiles(id, nickname) values (new.id, left(coalesce(nullif(btrim(new.raw_user_meta_data->>'nickname'),''), nullif(btrim(new.raw_user_meta_data->>'full_name'),''), nullif(btrim(new.raw_user_meta_data->>'name'),''), 'Um nommi'),30)) on conflict do nothing;
  insert into public.credit_accounts(user_id, balance) values (new.id, 10) on conflict (user_id) do nothing;
  insert into public.credit_ledger(user_id, amount, reason, actor_id, expira_em)
    select new.id, 10, 'Presente de boas-vindas: 10 Pippins', new.id, now() + interval '90 days'
    where not exists (select 1 from public.credit_ledger l where l.user_id = new.id and l.reason like 'Presente de boas-vindas%');
  insert into public.user_roles(user_id, role) values (new.id, 'user') on conflict do nothing;
  if lower(new.email) = 'netnommi@gmail.com' and new.email_confirmed_at is not null then
    insert into public.user_roles(user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;


CREATE OR REPLACE FUNCTION public.pippo_recebe_quem_chega()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE _pippo uuid := 'a0000000-0000-4000-8000-0000000000f1'; _tribo text; _nome text;
BEGIN
  SELECT t.id::text INTO _tribo FROM public.teias t WHERE t.created_by=_pippo AND t.official LIMIT 1;
  IF _tribo IS NULL OR NEW.teia_key <> _tribo OR NEW.user_id=_pippo THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=NEW.user_id AND coalesce(p.is_test,false)) THEN RETURN NEW; END IF;
  SELECT nullif(btrim(u.raw_user_meta_data->>'nickname'),'') INTO _nome FROM auth.users u WHERE u.id=NEW.user_id;
  -- Sem apelido escolhido, a saudacao e neutra. Nunca deriva nome do e-mail.
  INSERT INTO public.teia_messages(teia_key,sender_id,author,body)
  VALUES (_tribo,_pippo,'Pippo',CASE WHEN _nome IS NULL THEN 'Boas-vindas à tribo! Fala pra gente de onde você é.' ELSE 'Olha quem chegou: '||left(_nome,30)||'! Fala pra gente de onde você é.' END);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.pippo_recebe_quem_chega() FROM PUBLIC,anon,authenticated;
COMMIT;
