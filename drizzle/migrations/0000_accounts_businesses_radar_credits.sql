create type public.app_role as enum ('admin','user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default '' check (char_length(nickname) <= 30),
  city text not null default '' check (char_length(city) <= 80),
  interests text[] not null default '{}',
  about text not null default '' check (char_length(about) <= 140),
  profile_mode text not null default 'publico' check (profile_mode in ('publico','privado')),
  is_business boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Ver perfis públicos ou o próprio" on public.profiles for select to authenticated using (profile_mode = 'publico' or id = auth.uid());
create policy "Criar o próprio perfil" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "Editar o próprio perfil" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Ver os próprios papéis" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

create policy "Admin vê todos os perfis" on public.profiles for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "Admin edita perfis" on public.profiles for update to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null check (char_length(name) between 2 and 60),
  kind text not null default '' check (char_length(kind) <= 80),
  area text not null default '' check (char_length(area) <= 80),
  hours text not null default '' check (char_length(hours) <= 80),
  capacity text not null default '' check (char_length(capacity) <= 80),
  offer text not null default '' check (char_length(offer) <= 200),
  interests text[] not null default '{}',
  note text not null default '' check (char_length(note) <= 200),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.businesses to authenticated;
grant all on public.businesses to service_role;
alter table public.businesses enable row level security;
create policy "Ver empresas ativas" on public.businesses for select to authenticated using (active or owner_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Criar a própria empresa" on public.businesses for insert to authenticated with check (owner_id = auth.uid());
create policy "Editar a própria empresa ou admin" on public.businesses for update to authenticated using (owner_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Apagar a própria empresa ou admin" on public.businesses for delete to authenticated using (owner_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.meetup_ideas (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  owner_id uuid not null,
  title text not null check (char_length(title) <= 120),
  description text not null default '' check (char_length(description) <= 600),
  when_text text not null default '' check (char_length(when_text) <= 120),
  teia_size text not null default '' check (char_length(teia_size) <= 60),
  bonus text not null default '' check (char_length(bonus) <= 300),
  welcoming text not null default '' check (char_length(welcoming) <= 300),
  points int not null default 20 check (points between 10 and 40),
  status text not null default 'rascunho' check (status in ('rascunho','publicada','arquivada')),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.meetup_ideas to authenticated;
grant all on public.meetup_ideas to service_role;
alter table public.meetup_ideas enable row level security;
create policy "Ver ideias publicadas, próprias ou admin" on public.meetup_ideas for select to authenticated using (status = 'publicada' or owner_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Criar ideias da própria empresa" on public.meetup_ideas for insert to authenticated with check (owner_id = auth.uid() and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()));
create policy "Editar ideias próprias ou admin" on public.meetup_ideas for update to authenticated using (owner_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Apagar ideias próprias ou admin" on public.meetup_ideas for delete to authenticated using (owner_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.radar_presence (
  user_id uuid primary key,
  place_name text not null check (char_length(place_name) between 2 and 60),
  area text not null default '' check (char_length(area) <= 60),
  activity text not null check (char_length(activity) <= 30),
  until timestamptz not null,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.radar_presence to authenticated;
grant all on public.radar_presence to service_role;
alter table public.radar_presence enable row level security;
create policy "Ver presenças de perfis públicos" on public.radar_presence for select to authenticated using (user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = user_id and p.profile_mode = 'publico'));
create policy "Marcar a própria presença" on public.radar_presence for insert to authenticated with check (user_id = auth.uid());
create policy "Atualizar a própria presença" on public.radar_presence for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Sair do radar" on public.radar_presence for delete to authenticated using (user_id = auth.uid());

create or replace function public.validate_presence() returns trigger language plpgsql set search_path = public as $$
begin
  if new.until > now() + interval '3 hours' then new.until := now() + interval '3 hours'; end if;
  new.updated_at := now();
  return new;
end $$;
create trigger radar_presence_validate before insert or update on public.radar_presence for each row execute function public.validate_presence();

create table public.credit_accounts (
  user_id uuid primary key,
  balance int not null default 0 check (balance >= 0),
  boost_until timestamptz,
  updated_at timestamptz not null default now()
);
grant select on public.credit_accounts to authenticated;
grant all on public.credit_accounts to service_role;
alter table public.credit_accounts enable row level security;
create policy "Ver o próprio saldo ou admin" on public.credit_accounts for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount int not null,
  reason text not null check (char_length(reason) <= 200),
  actor_id uuid,
  created_at timestamptz not null default now()
);
grant select on public.credit_ledger to authenticated;
grant all on public.credit_ledger to service_role;
alter table public.credit_ledger enable row level security;
create policy "Ver o próprio histórico ou admin" on public.credit_ledger for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- Ajuste de saldo só por admin, registrado no histórico.
create or replace function public.admin_adjust_credits(_user_id uuid, _amount int, _reason text)
returns int language plpgsql security definer set search_path = public as $$
declare nb int;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  if _amount = 0 or abs(_amount) > 100000 then raise exception 'invalid amount'; end if;
  insert into public.credit_accounts(user_id, balance) values (_user_id, 0) on conflict (user_id) do nothing;
  update public.credit_accounts set balance = balance + _amount, updated_at = now() where user_id = _user_id returning balance into nb;
  if nb < 0 then raise exception 'saldo insuficiente'; end if;
  insert into public.credit_ledger(user_id, amount, reason, actor_id) values (_user_id, _amount, left(coalesce(_reason,'Ajuste do administrador'),200), auth.uid());
  return nb;
end $$;
grant execute on function public.admin_adjust_credits(uuid,int,text) to authenticated;

-- Gastar créditos com destaque de 24 h (5 créditos), feito no servidor.
create or replace function public.spend_boost()
returns timestamptz language plpgsql security definer set search_path = public as $$
declare nu timestamptz;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update public.credit_accounts set balance = balance - 5,
    boost_until = greatest(coalesce(boost_until, now()), now()) + interval '24 hours', updated_at = now()
    where user_id = auth.uid() and balance >= 5 returning boost_until into nu;
  if nu is null then raise exception 'saldo insuficiente'; end if;
  insert into public.credit_ledger(user_id, amount, reason, actor_id) values (auth.uid(), -5, 'Destaque do perfil por 24 h', auth.uid());
  return nu;
end $$;
grant execute on function public.spend_boost() to authenticated;

-- Novo usuário: cria perfil, conta de créditos e papel; e-mail do administrador recebe admin.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, nickname) values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1), ''),30)) on conflict do nothing;
  insert into public.credit_accounts(user_id) values (new.id) on conflict do nothing;
  insert into public.user_roles(user_id, role) values (new.id, 'user') on conflict do nothing;
  if lower(new.email) = 'netnommi@gmail.com' and new.email_confirmed_at is not null then
    insert into public.user_roles(user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.handle_user_confirmed() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(new.email) = 'netnommi@gmail.com' and new.email_confirmed_at is not null and old.email_confirmed_at is null then
    insert into public.user_roles(user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user_confirmed after update of email_confirmed_at on auth.users for each row execute function public.handle_user_confirmed();
