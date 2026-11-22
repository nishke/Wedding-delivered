create table public.event_quotations (
 id uuid primary key default gen_random_uuid(),
 caterer_id uuid not null references public.caterers(id) on delete cascade,
 event_id uuid not null,
 revision integer not null check (revision > 0),
 pricing_model text not null default 'fixed' check (pricing_model in ('fixed','per_plate')),
 guest_count integer check (guest_count is null or guest_count >= 0),
 subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
 gst_applicable boolean not null default false,
 gst_rate numeric(5,2) not null default 0 check (gst_rate >= 0 and gst_rate <= 100),
 gst_inclusive boolean not null default false,
 gst_amount numeric(12,2) not null default 0 check (gst_amount >= 0),
 total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
 status text not null default 'draft' check (status in ('draft','sent','accepted','rejected','superseded')),
 customer_notes text,
 internal_notes text,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (event_id,revision),
 unique (id,caterer_id),
 constraint quotation_event_same_caterer_fk foreign key (event_id,caterer_id)
 references public.events(id,caterer_id) on delete cascade
);
create table public.event_quotation_items (
 id uuid primary key default gen_random_uuid(),
 caterer_id uuid not null references public.caterers(id) on delete cascade,
 quotation_id uuid not null,
 description text not null check (length(trim(description)) > 0),
 quantity numeric(12,2) not null default 1 check (quantity >= 0),
 unit text not null default 'unit',
 unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
 line_total numeric(12,2) generated always as (round(quantity * unit_price,2)) stored,
 sort_order integer not null default 0,
 created_at timestamptz not null default now(),
 constraint quotation_item_same_caterer_fk foreign key (quotation_id,caterer_id)
 references public.event_quotations(id,caterer_id) on delete cascade
);
create index event_quotations_event_revision_idx on public.event_quotations(event_id,revision desc);
create index event_quotations_caterer_status_idx on public.event_quotations(caterer_id,status);
create index quotation_items_quotation_idx on public.event_quotation_items(quotation_id,caterer_id);
alter table public.event_quotations enable row level security;
alter table public.event_quotation_items enable row level security;
create policy "Members can view quotations" on public.event_quotations for select to authenticated using (private.is_caterer_member(caterer_id));
create policy "Managers can insert quotations" on public.event_quotations for insert to authenticated with check (exists(select 1 from public.caterer_memberships m where m.caterer_id=event_quotations.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));
create policy "Managers can update quotations" on public.event_quotations for update to authenticated using (exists(select 1 from public.caterer_memberships m where m.caterer_id=event_quotations.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager'))) with check (exists(select 1 from public.caterer_memberships m where m.caterer_id=event_quotations.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));
create policy "Owners can delete quotations" on public.event_quotations for delete to authenticated using (private.is_caterer_owner(caterer_id));
create policy "Members can view quotation items" on public.event_quotation_items for select to authenticated using (private.is_caterer_member(caterer_id));
create policy "Managers can insert quotation items" on public.event_quotation_items for insert to authenticated with check (exists(select 1 from public.caterer_memberships m where m.caterer_id=event_quotation_items.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));
create policy "Managers can update quotation items" on public.event_quotation_items for update to authenticated using (exists(select 1 from public.caterer_memberships m where m.caterer_id=event_quotation_items.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager'))) with check (exists(select 1 from public.caterer_memberships m where m.caterer_id=event_quotation_items.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));
create policy "Owners can delete quotation items" on public.event_quotation_items for delete to authenticated using (private.is_caterer_owner(caterer_id));
create trigger set_event_quotations_updated_at before update on public.event_quotations for each row execute function public.set_updated_at();