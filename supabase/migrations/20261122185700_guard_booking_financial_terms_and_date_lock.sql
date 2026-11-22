create or replace function public.guard_booking_updates()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_role text;
begin
  select m.role into v_role from public.caterer_memberships m
  where m.caterer_id=old.caterer_id and m.user_id=(select auth.uid());
  if v_role is null then raise exception 'Workspace membership is required.'; end if;
  if v_role='staff' and (
    new.quoted_amount is distinct from old.quoted_amount or
    new.agreed_amount is distinct from old.agreed_amount or
    new.advance_percentage is distinct from old.advance_percentage or
    new.agreed_advance_amount is distinct from old.agreed_advance_amount
  ) then raise exception 'Only owners and managers can change booking financial terms.'; end if;
  if old.date_locked and new.event_date is distinct from old.event_date and new.date_locked then
    raise exception 'Unlock the booking date before changing it.';
  end if;
  if new.event_date is distinct from old.event_date then
    new.booking_approval_status:='pending';
    new.booking_approved_by:=null;
    new.booking_approved_at:=null;
    if old.status='confirmed' then new.status:='tentative'; end if;
  end if;
  return new;
end;
$$;
create trigger guard_booking_updates_before_write
before update on public.events
for each row execute function public.guard_booking_updates();