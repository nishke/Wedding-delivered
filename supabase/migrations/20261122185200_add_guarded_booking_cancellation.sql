create or replace function public.cancel_booking(p_booking_id uuid,p_reason text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_booking public.events%rowtype;
  v_user uuid := auth.uid();
  v_role text;
begin
  if v_user is null then raise exception 'Sign in is required.'; end if;
  select e.* into v_booking from public.events e where e.id=p_booking_id;
  if not found or not private.is_caterer_member(v_booking.caterer_id) then
    raise exception 'Booking not found or access denied.';
  end if;
  select m.role into v_role from public.caterer_memberships m
  where m.caterer_id=v_booking.caterer_id and m.user_id=v_user;
  if v_role not in ('owner','manager') then raise exception 'Only an owner or manager can cancel a booking.'; end if;
  if nullif(trim(p_reason),'') is null then raise exception 'A cancellation reason is required.'; end if;
  update public.events set booking_approval_status='cancelled',booking_cancelled_by=v_user,
    booking_cancelled_at=now(),booking_cancellation_reason=trim(p_reason),status='cancelled',
    cancellation_reason=trim(p_reason) where id=p_booking_id;
  insert into public.event_activity(caterer_id,event_id,actor_id,activity_type,description,metadata)
  values(v_booking.caterer_id,p_booking_id,v_user,'booking_cancelled','Booking cancelled: '||trim(p_reason),
    jsonb_build_object('reason',trim(p_reason)));
end;
$$;
revoke all on function public.cancel_booking(uuid,text) from public,anon;
grant execute on function public.cancel_booking(uuid,text) to authenticated;