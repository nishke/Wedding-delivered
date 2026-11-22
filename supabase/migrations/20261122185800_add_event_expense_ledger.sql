create table public.event_expenses (
  id uuid primary key default gen_random_uuid(),
  caterer_id uuid not null references public.caterers(id) on delete cascade,
  event_id uuid not null,
  expense_type text not null check (expense_type in ('ingredients','labour','transport','equipment','miscellaneous')),
  amount numeric(12,2) not null check (amount >= 0),
  expense_date date not null default current_date,
  expense_status text not null default 'actual' check (expense_status in ('estimated','actual')),
  vendor_name text,
  notes text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_expenses_event_fk foreign key (event_id,caterer_id)
    references public.events(id,caterer_id) on delete cascade
);
create index event_expenses_event_caterer_idx on public.event_expenses(event_id,caterer_id);
create index event_expenses_caterer_date_idx on public.event_expenses(caterer_id,expense_date desc);
alter table public.event_expenses enable row level security;
revoke all on table public.event_expenses from anon;
grant select,insert,update,delete on table public.event_expenses to authenticated;
create policy "Managers and owners can view event expenses" on public.event_expenses
for select to authenticated using (
  exists(select 1 from public.caterer_memberships m where m.caterer_id=event_expenses.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager'))
);
create policy "Managers and owners can record event expenses" on public.event_expenses
for insert to authenticated with check (
  exists(select 1 from public.caterer_memberships m where m.caterer_id=event_expenses.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager'))
  and recorded_by=(select auth.uid())
);
create policy "Managers and owners can update event expenses" on public.event_expenses
for update to authenticated using (
  exists(select 1 from public.caterer_memberships m where m.caterer_id=event_expenses.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager'))
) with check (
  exists(select 1 from public.caterer_memberships m where m.caterer_id=event_expenses.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager'))
);
create policy "Owners can delete event expenses" on public.event_expenses
for delete to authenticated using ((select private.is_caterer_owner(caterer_id)));
create trigger set_event_expenses_updated_at before update on public.event_expenses
for each row execute function public.set_updated_at();