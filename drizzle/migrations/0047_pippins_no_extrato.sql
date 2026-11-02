-- O extrato fala a língua do app: Pippins e Pro.
--
-- Decisão da Ju (01/11): crédito vira Pippin e o plano vira Pro. Os textos
-- das telas mudaram na mesma leva; aqui mudam os textos que nascem no banco,
-- no extrato da carteira. Mesma regra de sempre: quem decide o texto é um
-- lugar só, e o histórico antigo não fica para trás falando outra língua.
--
-- 1. Presente de boas-vindas, prêmio de convite e compra passam a gravar
--    "Pippins". Só muda o texto; valores, travas e idempotência iguais.

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  insert into public.profiles(id, nickname) values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1), ''),30)) on conflict do nothing;
  insert into public.credit_accounts(user_id, balance) values (new.id, 10) on conflict (user_id) do nothing;
  insert into public.credit_ledger(user_id, amount, reason, actor_id)
    select new.id, 10, 'Presente de boas-vindas: 10 Pippins', new.id
    where not exists (select 1 from public.credit_ledger l where l.user_id = new.id and l.reason like 'Presente de boas-vindas%');
  insert into public.user_roles(user_id, role) values (new.id, 'user') on conflict do nothing;
  if lower(new.email) = 'netnommi@gmail.com' and new.email_confirmed_at is not null then
    insert into public.user_roles(user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.premiar_convite_se_vingou(_quem uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE dono uuid; codigo text;
BEGIN
  IF _quem IS NULL THEN RETURN; END IF;
  SELECT i.owner_id, i.code INTO dono, codigo FROM public.invites i
   WHERE i.used_by = _quem AND i.premiado_em IS NULL LIMIT 1;
  IF dono IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _quem AND coalesce(p.nickname,'') <> '' AND NOT coalesce(p.is_test,false)
  ) THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.teia_members m WHERE m.user_id = _quem) THEN RETURN; END IF;
  -- Marca antes de pagar: se dois gatilhos chegarem juntos, só um passa.
  UPDATE public.invites SET premiado_em = now() WHERE code = codigo AND premiado_em IS NULL;
  IF NOT FOUND THEN RETURN; END IF;
  INSERT INTO public.credit_accounts(user_id, balance) VALUES (dono, 0) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.credit_accounts SET balance = balance + 2, updated_at = now() WHERE user_id = dono;
  INSERT INTO public.credit_ledger(user_id, amount, reason, actor_id)
    VALUES (dono, 2, 'Convite que vingou: +2 Pippins', _quem);
END $$;
revoke all on function public.premiar_convite_se_vingou(uuid) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.grant_purchased_credits(_user_id uuid, _session_id text, _price_id text, _credits int, _amount int, _currency text, _env text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  insert into public.credit_purchases(user_id, stripe_session_id, price_id, credits, amount_total, currency, environment)
    values (_user_id, _session_id, _price_id, _credits, _amount, _currency, _env)
    on conflict (stripe_session_id) do nothing;
  if not found then return false; end if;
  insert into public.credit_accounts(user_id, balance) values (_user_id, 0) on conflict (user_id) do nothing;
  update public.credit_accounts set balance = balance + _credits, updated_at = now() where user_id = _user_id;
  insert into public.credit_ledger(user_id, amount, reason, actor_id) values (_user_id, _credits, 'Compra de ' || _credits || ' Pippins' || case when _env = 'sandbox' then ' (teste)' else '' end, _user_id);
  return true;
end $$;
revoke execute on function public.grant_purchased_credits(uuid,text,text,int,int,text,text) from public, anon, authenticated;
grant execute on function public.grant_purchased_credits(uuid,text,text,int,int,text,text) to service_role;

-- 2. A trava de criar tribo fala "Pro", como a página /pro.

CREATE OR REPLACE FUNCTION public.confere_criacao_de_tribo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.kind IS DISTINCT FROM 'teia' THEN RETURN NEW; END IF;
  IF public.has_role(NEW.created_by, 'admin') THEN RETURN NEW; END IF;
  -- is_test só vale para conta de teste; nos demais vira tribo comum e entra na regra.
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = NEW.created_by AND coalesce(p.is_test,false)) THEN
    NEW.is_test := false;
  END IF;
  IF NEW.is_test THEN RETURN NEW; END IF;
  IF NOT public.tem_premium(NEW.created_by) THEN
    RAISE EXCEPTION 'Criar tribo é Pro.' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.teias t
    WHERE t.created_by = NEW.created_by AND t.kind = 'teia' AND NOT coalesce(t.is_test, false)
  ) THEN
    RAISE EXCEPTION 'Uma tribo por pessoa.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

-- 3. O extrato antigo aprende a língua nova. Só o texto muda; valores e
--    datas ficam. O prefixo "Presente de boas-vindas" não muda, então a
--    trava de "uma vez só" continua valendo.
UPDATE public.credit_ledger SET reason = replace(reason, 'créditos', 'Pippins') WHERE reason LIKE '%créditos%';
