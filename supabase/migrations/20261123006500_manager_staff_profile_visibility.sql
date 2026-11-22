create policy "Managers can view workspace staff profiles" on public.profiles for select to authenticated using (
 exists(select 1 from public.caterer_memberships target
 join public.caterer_memberships viewer on viewer.caterer_id=target.caterer_id
 where target.user_id=profiles.id and viewer.user_id=(select auth.uid())
 and viewer.role in ('owner','manager'))
);
