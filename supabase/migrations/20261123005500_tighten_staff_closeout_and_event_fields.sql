-- Keep reconciliation and booking/customer controls private to managers.
drop policy "event_closeouts_member_select" on public.event_closeouts;
create policy "Managers can view event closeouts" on public.event_closeouts for select to authenticated using (
 exists(select 1 from public.caterer_memberships m where m.caterer_id=event_closeouts.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager'))
);

create or replace function private.guard_staff_event_updates()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
 if exists(select 1 from public.caterer_memberships m where m.caterer_id=old.caterer_id and m.user_id=(select auth.uid()) and m.role='staff') then
  if new.quoted_amount is distinct from old.quoted_amount
   or new.agreed_amount is distinct from old.agreed_amount
   or new.advance_percentage is distinct from old.advance_percentage
   or new.agreed_advance_amount is distinct from old.agreed_advance_amount
   or new.date_locked is distinct from old.date_locked
   or new.booking_approval_status is distinct from old.booking_approval_status
   or new.booking_approved_by is distinct from old.booking_approved_by
   or new.booking_approved_at is distinct from old.booking_approved_at
   or new.booking_cancelled_by is distinct from old.booking_cancelled_by
   or new.booking_cancelled_at is distinct from old.booking_cancelled_at
   or new.booking_cancellation_reason is distinct from old.booking_cancellation_reason
   or new.customer_id is distinct from old.customer_id
   or new.lead_id is distinct from old.lead_id
   or new.caterer_id is distinct from old.caterer_id
   or new.created_by is distinct from old.created_by
   or (new.status in ('confirmed','closed','cancelled') and new.status is distinct from old.status)
  then raise exception 'Staff cannot change booking approval, financial terms, customer linkage, or close/cancel events'; end if;
 end if;
 return new;
end;
$$;
