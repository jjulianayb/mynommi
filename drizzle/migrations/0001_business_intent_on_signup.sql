create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, nickname, is_business) values (new.id, left(coalesce(new.raw_user_meta_data->>'nickname', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1), ''),30), coalesce((new.raw_user_meta_data->>'is_business')::boolean, false)) on conflict do nothing;
  insert into public.credit_accounts(user_id) values (new.id) on conflict do nothing;
  insert into public.user_roles(user_id, role) values (new.id, 'user') on conflict do nothing;
  if lower(new.email) = 'netnommi@gmail.com' and new.email_confirmed_at is not null then
    insert into public.user_roles(user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $$;