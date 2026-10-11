create table public.credit_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  stripe_session_id text not null unique,
  price_id text not null,
  credits int not null check (credits > 0),
  amount_total int,
  currency text,
  environment text not null default 'sandbox',
  created_at timestamptz not null default now()
);
grant select on public.credit_purchases to authenticated;
grant all on public.credit_purchases to service_role;
alter table public.credit_purchases enable row level security;
create policy "Ver as próprias compras" on public.credit_purchases for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.grant_purchased_credits(_user_id uuid, _session_id text, _price_id text, _credits int, _amount int, _currency text, _env text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  insert into public.credit_purchases(user_id, stripe_session_id, price_id, credits, amount_total, currency, environment)
    values (_user_id, _session_id, _price_id, _credits, _amount, _currency, _env)
    on conflict (stripe_session_id) do nothing;
  if not found then return false; end if;
  insert into public.credit_accounts(user_id, balance) values (_user_id, 0) on conflict (user_id) do nothing;
  update public.credit_accounts set balance = balance + _credits, updated_at = now() where user_id = _user_id;
  insert into public.credit_ledger(user_id, amount, reason, actor_id) values (_user_id, _credits, 'Compra de ' || _credits || ' créditos' || case when _env = 'sandbox' then ' (teste)' else '' end, _user_id);
  return true;
end $$;
revoke execute on function public.grant_purchased_credits(uuid,text,text,int,int,text,text) from public, anon, authenticated;
grant execute on function public.grant_purchased_credits(uuid,text,text,int,int,text,text) to service_role;