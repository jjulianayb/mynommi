revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_confirmed() from public, anon, authenticated;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.admin_adjust_credits(uuid,int,text) from public, anon;
revoke execute on function public.spend_boost() from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.admin_adjust_credits(uuid,int,text) to authenticated;
grant execute on function public.spend_boost() to authenticated;