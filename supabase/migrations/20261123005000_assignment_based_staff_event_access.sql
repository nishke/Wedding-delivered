-- Assignment-based staff access for event operations.
create table public.event_assignments (
 id uuid primary key default gen_random_uuid(),
 caterer_id uuid not null references public.caterers(id) on delete cascade,
 event_id uuid not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 assigned_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 constraint event_assignments_event_fk foreign key (event_id,caterer_id) references public.events(id,caterer_id) on delete cascade,
 constraint event_assignments_unique unique(event_id,user_id)
);
create index event_assignments_user_event_idx on public.event_assignments(user_id,event_id);
create index event_assignments_caterer_idx on public.event_assignments(caterer_id);
alter table public.event_assignments enable row level security;

create or replace function private.is_event_assigned(p_event_id uuid,p_caterer_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from public.event_assignments a where a.event_id=p_event_id and a.caterer_id=p_caterer_id and a.user_id=(select auth.uid()));
$$;
revoke all on function private.is_event_assigned(uuid,uuid) from public, anon;
grant execute on function private.is_event_assigned(uuid,uuid) to authenticated;

create policy "Members can view their event assignments" on public.event_assignments for select to authenticated using (
 private.is_caterer_member(caterer_id) and (user_id=(select auth.uid()) or private.is_caterer_owner(caterer_id) or exists(select 1 from public.caterer_memberships m where m.caterer_id=event_assignments.caterer_id and m.user_id=(select auth.uid()) and m.role='manager'))
);
create policy "Managers can assign event staff" on public.event_assignments for insert to authenticated with check (
 private.is_caterer_member(caterer_id) and exists(select 1 from public.caterer_memberships m where m.caterer_id=event_assignments.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager'))
 and exists(select 1 from public.caterer_memberships staff where staff.caterer_id=event_assignments.caterer_id and staff.user_id=event_assignments.user_id and staff.role='staff')
);
create policy "Managers can remove event staff" on public.event_assignments for delete to authenticated using (
 exists(select 1 from public.caterer_memberships m where m.caterer_id=event_assignments.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager'))
);

drop policy "Members can view events" on public.events;
create policy "Members can view assigned events" on public.events for select to authenticated using (
 private.is_caterer_member(caterer_id) and (exists(select 1 from public.caterer_memberships m where m.caterer_id=events.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')) or private.is_event_assigned(id,caterer_id))
);
drop policy "Members can update events" on public.events;
create policy "Managers update events and staff update assigned events" on public.events for update to authenticated using (
 private.is_caterer_member(caterer_id) and (exists(select 1 from public.caterer_memberships m where m.caterer_id=events.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')) or private.is_event_assigned(id,caterer_id))
) with check (
 private.is_caterer_member(caterer_id) and (exists(select 1 from public.caterer_memberships m where m.caterer_id=events.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')) or private.is_event_assigned(id,caterer_id))
);

drop policy "Members can view event functions" on public.event_functions;
create policy "Members can view assigned event functions" on public.event_functions for select to authenticated using (
 private.is_caterer_member(caterer_id) and (exists(select 1 from public.caterer_memberships m where m.caterer_id=event_functions.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')) or private.is_event_assigned(booking_id,caterer_id))
);
drop policy "Members can create event functions" on public.event_functions;
create policy "Managers create event functions" on public.event_functions for insert to authenticated with check (
 exists(select 1 from public.caterer_memberships m where m.caterer_id=event_functions.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager'))
);
drop policy "Members can update event functions" on public.event_functions;
create policy "Managers update event functions" on public.event_functions for update to authenticated using (
 exists(select 1 from public.caterer_memberships m where m.caterer_id=event_functions.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager'))
) with check (exists(select 1 from public.caterer_memberships m where m.caterer_id=event_functions.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));

drop policy "Members can view event activity" on public.event_activity;
create policy "Members can view assigned event activity" on public.event_activity for select to authenticated using (
 private.is_caterer_member(caterer_id) and (exists(select 1 from public.caterer_memberships m where m.caterer_id=event_activity.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')) or private.is_event_assigned(event_id,caterer_id))
);
drop policy "Members can create event activity" on public.event_activity;
create policy "Members can create assigned event activity" on public.event_activity for insert to authenticated with check (
 private.is_caterer_member(caterer_id) and (exists(select 1 from public.caterer_memberships m where m.caterer_id=event_activity.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')) or private.is_event_assigned(event_id,caterer_id))
);

drop policy "Members can view customers" on public.customers;
create policy "Managers view all and staff view assigned customers" on public.customers for select to authenticated using (
 private.is_caterer_member(caterer_id) and (exists(select 1 from public.caterer_memberships m where m.caterer_id=customers.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')) or exists(select 1 from public.events e where e.customer_id=customers.id and e.caterer_id=customers.caterer_id and private.is_event_assigned(e.id,e.caterer_id)))
);
drop policy "Members can view leads" on public.leads;
create policy "Managers can view leads" on public.leads for select to authenticated using (
 exists(select 1 from public.caterer_memberships m where m.caterer_id=leads.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager'))
);

drop policy "Members can view quotations" on public.event_quotations;
create policy "Managers can view quotations" on public.event_quotations for select to authenticated using (
 exists(select 1 from public.caterer_memberships m where m.caterer_id=event_quotations.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager'))
);
drop policy "Members can view quotation items" on public.event_quotation_items;
create policy "Managers can view quotation items" on public.event_quotation_items for select to authenticated using (
 exists(select 1 from public.caterer_memberships m where m.caterer_id=event_quotation_items.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager'))
);
drop policy "Members can view event menus" on public.event_menu_items;
create policy "Members can view assigned event menus" on public.event_menu_items for select to authenticated using (
 private.is_caterer_member(caterer_id) and exists(select 1 from public.event_functions f where f.id=event_menu_items.event_function_id and (
  exists(select 1 from public.caterer_memberships m where m.caterer_id=f.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')) or private.is_event_assigned(f.booking_id,f.caterer_id)
 ))
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
   or (new.status in ('confirmed','closed','cancelled') and new.status is distinct from old.status)
  then raise exception 'Staff cannot change booking approval, financial terms, or close/cancel events'; end if;
 end if;
 return new;
end;
$$;
drop trigger if exists guard_staff_event_updates on public.events;
create trigger guard_staff_event_updates before update on public.events for each row execute function private.guard_staff_event_updates();
