-- Allocate receipts to a specific booking while retaining a customer-level ledger.
alter table public.customer_payments add column booking_id uuid;
alter table public.customer_payments add constraint customer_payments_booking_fk
foreign key (booking_id,caterer_id) references public.events(id,caterer_id) on delete restrict;
create index customer_payments_booking_caterer_idx on public.customer_payments(booking_id,caterer_id);

create or replace function public.approve_booking(p_booking_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_booking public.events%rowtype;
  v_user uuid := auth.uid();
  v_paid numeric(12,2);
  v_role text;
begin
  if v_user is null then raise exception 'Sign in is required.'; end if;
  select e.* into v_booking from public.events e where e.id=p_booking_id;
  if not found or not private.is_caterer_member(v_booking.caterer_id) then raise exception 'Booking not found or access denied.'; end if;
  select m.role into v_role from public.caterer_memberships m where m.caterer_id=v_booking.caterer_id and m.user_id=v_user;
  if v_role not in ('owner','manager') then raise exception 'Only an owner or manager can approve a booking.'; end if;
  if v_booking.date_locked is not true then raise exception 'Lock the booking date before approval.'; end if;
  if v_booking.customer_id is null then raise exception 'A customer must be linked before approval.'; end if;
  if v_booking.agreed_advance_amount <= 0 then raise exception 'Set the agreed booking amount and advance requirement first.'; end if;
  select coalesce(sum(p.amount),0) into v_paid from public.customer_payments p where p.booking_id=p_booking_id and p.caterer_id=v_booking.caterer_id;
  if v_paid < v_booking.agreed_advance_amount then raise exception 'Booking-linked receipts: %, required advance: %.',v_paid,v_booking.agreed_advance_amount; end if;
  update public.events set booking_approval_status='approved',booking_approved_by=v_user,booking_approved_at=now(),status='confirmed' where id=p_booking_id;
  insert into public.event_activity(caterer_id,event_id,actor_id,activity_type,description,metadata)
  values(v_booking.caterer_id,p_booking_id,v_user,'booking_approved','Booking approved after advance and date lock.',
    jsonb_build_object('advance_required',v_booking.agreed_advance_amount,'booking_receipts',v_paid));
end;
$$;
revoke all on function public.approve_booking(uuid) from public,anon;
grant execute on function public.approve_booking(uuid) to authenticated;