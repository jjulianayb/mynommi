create table public.invite_boosts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  invite_ref text not null check (char_length(invite_ref) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (user_id, invite_ref)
);
grant select on public.invite_boosts to authenticated;
grant all on public.invite_boosts to service_role;
alter table public.invite_boosts enable row level security;
create policy "Ver os próprios destaques de convite" on public.invite_boosts for select to authenticated using (user_id = auth.uid());

create or replace function public.spend_invite_boost(_invite_ref text)
returns int language plpgsql security definer set search_path = public as $$
declare nb int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if _invite_ref is null or char_length(_invite_ref) not between 1 and 80 then raise exception 'convite inválido'; end if;
  if exists (select 1 from public.invite_boosts where user_id = auth.uid() and invite_ref = _invite_ref) then
    select balance into nb from public.credit_accounts where user_id = auth.uid(); return coalesce(nb,0);
  end if;
  update public.credit_accounts set balance = balance - 3, updated_at = now()
    where user_id = auth.uid() and balance >= 3 returning balance into nb;
  if nb is null then raise exception 'saldo insuficiente'; end if;
  insert into public.invite_boosts(user_id, invite_ref) values (auth.uid(), _invite_ref);
  insert into public.credit_ledger(user_id, amount, reason, actor_id) values (auth.uid(), -3, 'Convite em destaque', auth.uid());
  return nb;
end $$;
revoke execute on function public.spend_invite_boost(text) from public, anon;
grant execute on function public.spend_invite_boost(text) to authenticated;