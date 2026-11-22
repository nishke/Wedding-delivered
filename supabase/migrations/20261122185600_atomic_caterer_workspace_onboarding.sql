create or replace function public.create_caterer_workspace(p_name text,p_phone text default null,p_address text default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_caterer uuid;
begin
  if v_user is null then raise exception 'Sign in is required.'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'Business name is required.'; end if;
  if exists(select 1 from public.caterer_memberships where user_id=v_user) then
    raise exception 'This account already belongs to a catering workspace.';
  end if;
  insert into public.caterers(name,phone,address,owner_user_id)
  values(trim(p_name),nullif(trim(p_phone),''),nullif(trim(p_address),''),v_user)
  returning id into v_caterer;
  insert into public.caterer_memberships(caterer_id,user_id,role)
  values(v_caterer,v_user,'owner');
  return v_caterer;
end;
$$;
revoke all on function public.create_caterer_workspace(text,text,text) from public,anon;
grant execute on function public.create_caterer_workspace(text,text,text) to authenticated;