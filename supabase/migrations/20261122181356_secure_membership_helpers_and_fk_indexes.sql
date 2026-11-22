-- Security hardening and indexes for the initial catering operations schema.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create or replace function private.is_caterer_member(target_caterer_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select (select auth.uid()) is not null and exists (
 select 1 from public.caterer_memberships m
 where m.caterer_id = target_caterer_id and m.user_id = (select auth.uid())
); $$;
create or replace function private.is_caterer_owner(target_caterer_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select (select auth.uid()) is not null and exists (
 select 1 from public.caterer_memberships m
 where m.caterer_id = target_caterer_id and m.user_id = (select auth.uid()) and m.role = 'owner'
); $$;
revoke all on function private.is_caterer_member(uuid) from public, anon;
revoke all on function private.is_caterer_owner(uuid) from public, anon;
grant execute on function private.is_caterer_member(uuid) to authenticated;
grant execute on function private.is_caterer_owner(uuid) to authenticated;
do $$
declare p record; stmt text;
begin
 for p in select schemaname, tablename, policyname, qual, with_check from pg_policies
 where schemaname='public' and (
 coalesce(qual,'') like '%is_caterer_member%' or coalesce(qual,'') like '%is_caterer_owner%'
 or coalesce(with_check,'') like '%is_caterer_member%' or coalesce(with_check,'') like '%is_caterer_owner%')
 loop
  stmt := format('alter policy %I on %I.%I',p.policyname,p.schemaname,p.tablename);
  if p.qual is not null then stmt := stmt || ' using (' || replace(replace(p.qual,'is_caterer_member','private.is_caterer_member'),'is_caterer_owner','private.is_caterer_owner') || ')'; end if;
  if p.with_check is not null then stmt := stmt || ' with check (' || replace(replace(p.with_check,'is_caterer_member','private.is_caterer_member'),'is_caterer_owner','private.is_caterer_owner') || ')'; end if;
  execute stmt;
 end loop;
end $$;
drop function if exists public.is_caterer_member(uuid);
drop function if exists public.is_caterer_owner(uuid);
create index if not exists caterers_owner_user_idx on public.caterers(owner_user_id);
create index if not exists event_activity_actor_idx on public.event_activity(actor_id);
create index if not exists event_activity_caterer_idx on public.event_activity(caterer_id);
create index if not exists events_created_by_idx on public.events(created_by);
create index if not exists events_lead_idx on public.events(lead_id);
create index if not exists leads_customer_idx on public.leads(customer_id);
