-- Booking-level function schedule and customer-level payment ledger.
-- A booking remains one commercial engagement; functions are its service schedule.
-- Payments are recorded against the customer account, not individual functions.

alter table public.customers add constraint customers_id_caterer_unique unique (id,caterer_id);
alter table public.events add constraint events_id_caterer_unique unique (id,caterer_id);

create table public.event_functions (
  id uuid primary key default gen_random_uuid(),
  caterer_id uuid not null references public.caterers(id) on delete cascade,
  booking_id uuid not null,
  function_name text not null,
  function_date date not null,
  start_time time,
  end_time time,
  venue text,
  expected_guest_count integer check (expected_guest_count is null or expected_guest_count >= 0),
  final_guest_count integer check (final_guest_count is null or final_guest_count >= 0),
  menu_notes text,
  special_instructions text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_functions_booking_fk foreign key (booking_id,caterer_id)
    references public.events(id,caterer_id) on delete cascade
);
create index event_functions_booking_id_idx on public.event_functions(booking_id);
create index event_functions_caterer_date_idx on public.event_functions(caterer_id,function_date);
create index event_functions_booking_caterer_idx on public.event_functions(booking_id,caterer_id);

create table public.customer_payments (
  id uuid primary key default gen_random_uuid(),
  caterer_id uuid not null references public.caterers(id) on delete cascade,
  customer_id uuid not null,
  amount numeric(12,2) not null check (amount > 0),
  payment_date date not null default current_date,
  payment_method text not null check (payment_method in ('cash','upi','bank_transfer','gateway','cheque','other')),
  reference_number text,
  notes text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint customer_payments_customer_fk foreign key (customer_id,caterer_id)
    references public.customers(id,caterer_id) on delete restrict
);
create index customer_payments_customer_date_idx on public.customer_payments(customer_id,payment_date desc);
create index customer_payments_caterer_date_idx on public.customer_payments(caterer_id,payment_date desc);
create index customer_payments_customer_caterer_idx on public.customer_payments(customer_id,caterer_id);
create index customer_payments_recorded_by_idx on public.customer_payments(recorded_by);

alter table public.events
  add column date_locked boolean not null default false,
  add column booking_approval_status text not null default 'pending'
    check (booking_approval_status in ('pending','approved','cancelled')),
  add column booking_approved_by uuid references auth.users(id) on delete set null,
  add column booking_approved_at timestamptz,
  add column booking_cancelled_by uuid references auth.users(id) on delete set null,
  add column booking_cancelled_at timestamptz,
  add column booking_cancellation_reason text;
create index events_booking_approved_by_idx on public.events(booking_approved_by);
create index events_booking_cancelled_by_idx on public.events(booking_cancelled_by);

alter table public.event_functions enable row level security;
alter table public.customer_payments enable row level security;
revoke all on table public.event_functions, public.customer_payments from anon;
grant select, insert, update, delete on table public.event_functions, public.customer_payments to authenticated;

create policy "Members can view event functions" on public.event_functions
for select to authenticated using ((select private.is_caterer_member(caterer_id)));
create policy "Members can create event functions" on public.event_functions
for insert to authenticated with check ((select private.is_caterer_member(caterer_id)));
create policy "Members can update event functions" on public.event_functions
for update to authenticated using ((select private.is_caterer_member(caterer_id)))
with check ((select private.is_caterer_member(caterer_id)));
create policy "Owners can delete event functions" on public.event_functions
for delete to authenticated using ((select private.is_caterer_owner(caterer_id)));

create policy "Members can view customer payments" on public.customer_payments
for select to authenticated using ((select private.is_caterer_member(caterer_id)));
create policy "Managers and owners can record customer payments" on public.customer_payments
for insert to authenticated with check (
  (select private.is_caterer_member(caterer_id))
  and exists (
    select 1 from public.caterer_memberships m
    where m.caterer_id = customer_payments.caterer_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner','manager')
  )
  and recorded_by = (select auth.uid())
);
create policy "Managers and owners can correct customer payments" on public.customer_payments
for update to authenticated using (
  exists (
    select 1 from public.caterer_memberships m
    where m.caterer_id = customer_payments.caterer_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner','manager')
  )
) with check (
  exists (
    select 1 from public.caterer_memberships m
    where m.caterer_id = customer_payments.caterer_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner','manager')
  )
);
create policy "Owners can delete customer payments" on public.customer_payments
for delete to authenticated using ((select private.is_caterer_owner(caterer_id)));

create trigger set_event_functions_updated_at before update on public.event_functions
for each row execute function public.set_updated_at();
