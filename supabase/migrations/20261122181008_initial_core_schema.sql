-- Initial core schema for Dhande's Ops.
-- Applied to Supabase project yboemyunqzchfoqzgqai.
create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create table public.caterers (
 id uuid primary key default gen_random_uuid(),
 name text not null, legal_name text, phone text, email text, address text,
 gstin text, fssai_license text,
 default_advance_percentage numeric(5,2) not null default 20.00 check (default_advance_percentage between 0 and 100),
 default_food_buffer_percentage numeric(5,2) not null default 15.00 check (default_food_buffer_percentage between 0 and 100),
 settings jsonb not null default '{}'::jsonb,
 owner_user_id uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text, phone text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.caterer_memberships (
 id uuid primary key default gen_random_uuid(),
 caterer_id uuid not null references public.caterers(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null default 'owner' check (role in ('owner','manager','staff')),
 created_at timestamptz not null default now(), unique(caterer_id,user_id)
);
create table public.customers (
 id uuid primary key default gen_random_uuid(),
 caterer_id uuid not null references public.caterers(id) on delete cascade,
 full_name text not null, phone text, email text, address text, notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.leads (
 id uuid primary key default gen_random_uuid(),
 caterer_id uuid not null references public.caterers(id) on delete cascade,
 customer_id uuid references public.customers(id) on delete set null,
 source text not null default 'other' check (source in ('whatsapp_personal','whatsapp_business','phone','referral','walk_in','other')),
 source_reference text, contact_name text, contact_phone text, event_type text, event_date date, venue text,
 expected_guest_count integer check (expected_guest_count is null or expected_guest_count >= 0),
 message_text text,
 status text not null default 'new' check (status in ('new','reviewing','quoted','converted','lost')),
 review_status text not null default 'needs_review' check (review_status in ('needs_review','approved','rejected')),
 extracted_details jsonb not null default '{}'::jsonb, notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.events (
 id uuid primary key default gen_random_uuid(),
 caterer_id uuid not null references public.caterers(id) on delete cascade,
 customer_id uuid references public.customers(id) on delete set null,
 lead_id uuid references public.leads(id) on delete set null,
 event_name text not null, event_type text, event_date date, start_time time, end_time time, venue text,
 expected_guest_count integer check (expected_guest_count is null or expected_guest_count >= 0),
 final_guest_count integer check (final_guest_count is null or final_guest_count >= 0),
 status text not null default 'enquiry' check (status in ('enquiry','quotation_in_progress','tentative','confirmed','preparation','completed','closed','cancelled')),
 cancellation_reason text,
 quoted_amount numeric(12,2) not null default 0 check (quoted_amount >= 0),
 agreed_amount numeric(12,2) not null default 0 check (agreed_amount >= 0),
 advance_percentage numeric(5,2) not null default 20.00 check (advance_percentage between 0 and 100),
 agreed_advance_amount numeric(12,2) not null default 0 check (agreed_advance_amount >= 0),
 special_instructions text, created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.event_activity (
 id uuid primary key default gen_random_uuid(),
 caterer_id uuid not null references public.caterers(id) on delete cascade,
 event_id uuid not null references public.events(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 activity_type text not null, description text not null, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);

create index caterers_owner_user_idx on public.caterers(owner_user_id);
create index caterer_memberships_user_idx on public.caterer_memberships(user_id);
create index customers_caterer_name_idx on public.customers(caterer_id,full_name);
create index leads_customer_idx on public.leads(customer_id);
create index leads_caterer_status_created_idx on public.leads(caterer_id,status,created_at desc);
create index leads_caterer_event_date_idx on public.leads(caterer_id,event_date);
create index events_caterer_date_idx on public.events(caterer_id,event_date);
create index events_caterer_status_idx on public.events(caterer_id,status);
create index events_customer_idx on public.events(customer_id);
create index events_lead_idx on public.events(lead_id);
create index events_created_by_idx on public.events(created_by);
create index event_activity_event_created_idx on public.event_activity(event_id,created_at desc);
create index event_activity_caterer_idx on public.event_activity(caterer_id);
create index event_activity_actor_idx on public.event_activity(actor_id);

create or replace function public.is_caterer_member(target_caterer_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.caterer_memberships m where m.caterer_id=target_caterer_id and m.user_id=(select auth.uid()));
$$;
create or replace function public.is_caterer_owner(target_caterer_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.caterer_memberships m where m.caterer_id=target_caterer_id and m.user_id=(select auth.uid()) and m.role='owner');
$$;
revoke all on function public.is_caterer_member(uuid) from public, anon;
revoke all on function public.is_caterer_owner(uuid) from public, anon;
grant execute on function public.is_caterer_member(uuid) to authenticated;
grant execute on function public.is_caterer_owner(uuid) to authenticated;

create trigger set_caterers_updated_at before update on public.caterers for each row execute function public.set_updated_at();
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_customers_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger set_leads_updated_at before update on public.leads for each row execute function public.set_updated_at();
create trigger set_events_updated_at before update on public.events for each row execute function public.set_updated_at();

alter table public.caterers enable row level security;
alter table public.profiles enable row level security;
alter table public.caterer_memberships enable row level security;
alter table public.customers enable row level security;
alter table public.leads enable row level security;
alter table public.events enable row level security;
alter table public.event_activity enable row level security;

grant select,insert,update,delete on public.caterers,public.profiles,public.caterer_memberships,public.customers,public.leads,public.events,public.event_activity to authenticated;

create policy "Members can view their caterers" on public.caterers for select to authenticated using (public.is_caterer_member(id));
create policy "Users can create a caterer for themselves" on public.caterers for insert to authenticated with check (owner_user_id=(select auth.uid()));
create policy "Owners can update their caterer" on public.caterers for update to authenticated using (public.is_caterer_owner(id)) with check (public.is_caterer_owner(id));
create policy "Owners can delete their caterer" on public.caterers for delete to authenticated using (public.is_caterer_owner(id));

create policy "Users can view their own profile" on public.profiles for select to authenticated using (id=(select auth.uid()));
create policy "Users can create their own profile" on public.profiles for insert to authenticated with check (id=(select auth.uid()));
create policy "Users can update their own profile" on public.profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));

create policy "Members can view memberships in their caterer" on public.caterer_memberships for select to authenticated using (public.is_caterer_member(caterer_id));
create policy "Owners can create memberships for their caterer" on public.caterer_memberships for insert to authenticated with check (role='owner' and user_id=(select auth.uid()) and exists(select 1 from public.caterers c where c.id=caterer_id and c.owner_user_id=(select auth.uid())));
create policy "Owners can add or change memberships" on public.caterer_memberships for update to authenticated using (public.is_caterer_owner(caterer_id)) with check (public.is_caterer_owner(caterer_id));
create policy "Owners can remove memberships" on public.caterer_memberships for delete to authenticated using (public.is_caterer_owner(caterer_id));

create policy "Members can view customers" on public.customers for select to authenticated using (public.is_caterer_member(caterer_id));
create policy "Members can create customers" on public.customers for insert to authenticated with check (public.is_caterer_member(caterer_id));
create policy "Members can update customers" on public.customers for update to authenticated using (public.is_caterer_member(caterer_id)) with check (public.is_caterer_member(caterer_id));
create policy "Owners can delete customers" on public.customers for delete to authenticated using (public.is_caterer_owner(caterer_id));

create policy "Members can view leads" on public.leads for select to authenticated using (public.is_caterer_member(caterer_id));
create policy "Members can create leads" on public.leads for insert to authenticated with check (public.is_caterer_member(caterer_id));
create policy "Members can update leads" on public.leads for update to authenticated using (public.is_caterer_member(caterer_id)) with check (public.is_caterer_member(caterer_id));
create policy "Owners can delete leads" on public.leads for delete to authenticated using (public.is_caterer_owner(caterer_id));

create policy "Members can view events" on public.events for select to authenticated using (public.is_caterer_member(caterer_id));
create policy "Members can create events" on public.events for insert to authenticated with check (public.is_caterer_member(caterer_id));
create policy "Members can update events" on public.events for update to authenticated using (public.is_caterer_member(caterer_id)) with check (public.is_caterer_member(caterer_id));
create policy "Owners can delete events" on public.events for delete to authenticated using (public.is_caterer_owner(caterer_id));

create policy "Members can view event activity" on public.event_activity for select to authenticated using (public.is_caterer_member(caterer_id));
create policy "Members can create event activity" on public.event_activity for insert to authenticated with check (public.is_caterer_member(event_activity.caterer_id) and exists(select 1 from public.events e where e.id=event_id and e.caterer_id=event_activity.caterer_id));
create policy "Owners can delete event activity" on public.event_activity for delete to authenticated using (public.is_caterer_owner(caterer_id));
