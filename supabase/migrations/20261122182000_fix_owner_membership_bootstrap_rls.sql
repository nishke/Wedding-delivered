-- Allow the first owner membership to be created without being blocked by
-- the caterers SELECT policy (which requires an existing membership).
create or replace function private.is_caterer_creator(target_caterer_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select (select auth.uid()) is not null and exists (
 select 1 from public.caterers c
 where c.id = target_caterer_id and c.owner_user_id = (select auth.uid())
); $$;
revoke all on function private.is_caterer_creator(uuid) from public, anon;
grant execute on function private.is_caterer_creator(uuid) to authenticated;
drop policy if exists "Owners can create memberships for their caterer" on public.caterer_memberships;
create policy "Owners can create memberships for their caterer"
on public.caterer_memberships for insert to authenticated
with check (role = 'owner' and user_id = (select auth.uid()) and (select private.is_caterer_creator(caterer_id)));
