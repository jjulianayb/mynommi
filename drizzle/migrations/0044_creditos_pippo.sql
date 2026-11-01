-- Créditos de verdade: boas-vindas, figurinha do Pippo, prêmio de convite e
-- regra de criar tribo. (Decisão da Ju em 01/11/2026, no WhatsApp.)
--
-- Aplicada manualmente pelo SQL editor do Lovable Cloud em 01/11/2026, porque
-- os créditos do Lovable acabaram e o chat não podia rodar a fila. Se o
-- controle de migrações tentar aplicar de novo, tudo aqui é idempotente:
-- CREATE OR REPLACE, IF NOT EXISTS e o backfill só roda para quem ainda não
-- tem a linha "Presente de boas-vindas" no extrato.
--
-- Três cuidados que estão no código e não podem sair:
--
-- 1. Saldo nunca fica negativo. O banco confere o saldo na hora de descontar
--    (balance >= custo), não a tela. Tela que confere sozinha é tela que um
--    dia esquece.
-- 2. O prêmio do convite sai UMA vez por pessoa convidada, e só quando ela
--    vinga (apelido + uma tribo, conta de teste não conta). Premiar clique
--    é pagar para espalhar link em grupo, e link espalhado queima a nommi.
-- 3. A trava de criar tribo mora num gatilho no banco, não na tela. A tela
--    avisa bonito, mas quem decide é o banco.

-- ---------------------------------------------------------------------------
-- 1. Boas-vindas: 10 créditos para quem entra, e também para quem já entrou.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  insert into public.profiles(id, nickname) values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1), ''),30)) on conflict do nothing;
  insert into public.credit_accounts(user_id, balance) values (new.id, 10) on conflict (user_id) do nothing;
  insert into public.credit_ledger(user_id, amount, reason, actor_id)
    select new.id, 10, 'Presente de boas-vindas: 10 créditos', new.id
    where not exists (select 1 from public.credit_ledger l where l.user_id = new.id and l.reason like 'Presente de boas-vindas%');
  insert into public.user_roles(user_id, role) values (new.id, 'user') on conflict do nothing;
  if lower(new.email) = 'netnommi@gmail.com' and new.email_confirmed_at is not null then
    insert into public.user_roles(user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Quem já tem conta ganha os 10 também, uma vez só. Conta de teste fica de
-- fora: crédito de mentira não precisa de presente de verdade.
UPDATE public.credit_accounts ca SET balance = balance + 10, updated_at = now()
WHERE NOT EXISTS (
    SELECT 1 FROM public.credit_ledger l
    WHERE l.user_id = ca.user_id AND l.reason LIKE 'Presente de boas-vindas%'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = ca.user_id AND coalesce(p.is_test, false)
  );
INSERT INTO public.credit_ledger (user_id, amount, reason, actor_id)
SELECT ca.user_id, 10, 'Presente de boas-vindas: 10 créditos', ca.user_id
FROM public.credit_accounts ca
WHERE NOT EXISTS (
    SELECT 1 FROM public.credit_ledger l
    WHERE l.user_id = ca.user_id AND l.reason LIKE 'Presente de boas-vindas%'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = ca.user_id AND coalesce(p.is_test, false)
  );

-- ---------------------------------------------------------------------------
-- 2. Figurinha do Pippo: 1 crédito por envio. Premium (tem_premium) não gasta.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.gastar_figurinha()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if auth.uid() is null then return false; end if;
  if public.tem_premium(auth.uid()) then return true; end if;
  update public.credit_accounts set balance = balance - 1, updated_at = now()
   where user_id = auth.uid() and balance >= 1;
  if not found then return false; end if;
  insert into public.credit_ledger(user_id, amount, reason, actor_id)
    values (auth.uid(), -1, 'Figurinha do Pippo', auth.uid());
  return true;
end $$;
revoke all on function public.gastar_figurinha() from public, anon;
grant execute on function public.gastar_figurinha() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Convite que vinga: +2 créditos para quem convidou, uma vez por pessoa.
--    "Vingou" = escolheu apelido E entrou em pelo menos uma tribo (a mesma
--    regra de convites_que_vingaram). Conta de teste não gera prêmio.
-- ---------------------------------------------------------------------------

ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS premiado_em timestamptz;

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
    VALUES (dono, 2, 'Convite que vingou: +2 créditos', _quem);
END $$;
revoke all on function public.premiar_convite_se_vingou(uuid) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.gatilho_premio_convite_membro()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.premiar_convite_se_vingou(NEW.user_id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS teia_members_premio_convite ON public.teia_members;
CREATE TRIGGER teia_members_premio_convite
AFTER INSERT ON public.teia_members
FOR EACH ROW EXECUTE FUNCTION public.gatilho_premio_convite_membro();

CREATE OR REPLACE FUNCTION public.gatilho_premio_convite_perfil()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.premiar_convite_se_vingou(NEW.id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS profiles_premio_convite ON public.profiles;
CREATE TRIGGER profiles_premio_convite
AFTER INSERT OR UPDATE OF nickname, is_test ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.gatilho_premio_convite_perfil();

-- ---------------------------------------------------------------------------
-- 4. Criar tribo: só Premium, uma tribo por pessoa. A trava é do banco.
--    Rolês (kind 'role') não entram na regra. Admin passa: é assim que a
--    nommi cria as tribos oficiais. Tribo de teste não conta na cota.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.confere_criacao_de_tribo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.kind IS DISTINCT FROM 'teia' THEN RETURN NEW; END IF;
  IF coalesce(NEW.is_test, false) THEN RETURN NEW; END IF;
  IF public.has_role(NEW.created_by, 'admin') THEN RETURN NEW; END IF;
  IF NOT public.tem_premium(NEW.created_by) THEN
    RAISE EXCEPTION 'Criar tribo é Premium.' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.teias t
    WHERE t.created_by = NEW.created_by AND t.kind = 'teia' AND NOT coalesce(t.is_test, false)
  ) THEN
    RAISE EXCEPTION 'Uma tribo por pessoa.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
revoke all on function public.confere_criacao_de_tribo() from public, anon, authenticated;
DROP TRIGGER IF EXISTS teias_confere_criacao ON public.teias;
CREATE TRIGGER teias_confere_criacao
BEFORE INSERT ON public.teias
FOR EACH ROW EXECUTE FUNCTION public.confere_criacao_de_tribo();
