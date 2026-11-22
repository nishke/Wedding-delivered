drop policy if exists "Members can view customer payments" on public.customer_payments;
create policy "Managers and owners can view customer payments" on public.customer_payments
for select to authenticated using (
  exists (
    select 1 from public.caterer_memberships m
    where m.caterer_id=customer_payments.caterer_id
      and m.user_id=(select auth.uid())
      and m.role in ('owner','manager')
  )
);