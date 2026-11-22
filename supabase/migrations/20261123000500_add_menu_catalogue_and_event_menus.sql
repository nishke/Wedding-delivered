alter table public.event_functions add constraint event_functions_id_caterer_unique unique (id, caterer_id);

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  caterer_id uuid not null references public.caterers(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, caterer_id),
  unique (caterer_id, name)
);

create table public.dishes (
  id uuid primary key default gen_random_uuid(),
  caterer_id uuid not null references public.caterers(id) on delete cascade,
  category_id uuid,
  name text not null check (length(trim(name)) > 0),
  description text,
  serving_unit text not null default 'portion',
  default_unit_price numeric(12,2) check (default_unit_price is null or default_unit_price >= 0),
  is_vegetarian boolean,
  allergens text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, caterer_id),
  constraint dishes_category_same_caterer_fk foreign key (category_id, caterer_id)
    references public.menu_categories(id, caterer_id) on delete set null (category_id)
);

create table public.event_menu_items (
  id uuid primary key default gen_random_uuid(),
  caterer_id uuid not null references public.caterers(id) on delete cascade,
  event_function_id uuid not null,
  dish_id uuid,
  item_name text not null check (length(trim(item_name)) > 0),
  category_name text,
  quantity numeric(12,2) check (quantity is null or quantity >= 0),
  serving_unit text not null default 'portion',
  unit_price numeric(12,2) check (unit_price is null or unit_price >= 0),
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_menu_function_same_caterer_fk foreign key (event_function_id, caterer_id)
    references public.event_functions(id, caterer_id) on delete cascade,
  constraint event_menu_dish_same_caterer_fk foreign key (dish_id, caterer_id)
    references public.dishes(id, caterer_id) on delete set null (dish_id)
);

create index menu_categories_caterer_sort_idx on public.menu_categories(caterer_id, sort_order);
create index dishes_caterer_category_idx on public.dishes(caterer_id, category_id);
create index event_menu_function_sort_idx on public.event_menu_items(event_function_id, sort_order);
create index event_menu_caterer_idx on public.event_menu_items(caterer_id);

alter table public.menu_categories enable row level security;
alter table public.dishes enable row level security;
alter table public.event_menu_items enable row level security;

create policy "Members can view menu categories" on public.menu_categories for select to authenticated
using (private.is_caterer_member(caterer_id));
create policy "Managers can manage menu categories" on public.menu_categories for all to authenticated
using (exists (select 1 from public.caterer_memberships m where m.caterer_id = menu_categories.caterer_id and m.user_id = auth.uid() and m.role in ('owner','manager')))
with check (exists (select 1 from public.caterer_memberships m where m.caterer_id = menu_categories.caterer_id and m.user_id = auth.uid() and m.role in ('owner','manager')));

create policy "Members can view dishes" on public.dishes for select to authenticated
using (private.is_caterer_member(caterer_id));
create policy "Managers can manage dishes" on public.dishes for all to authenticated
using (exists (select 1 from public.caterer_memberships m where m.caterer_id = dishes.caterer_id and m.user_id = auth.uid() and m.role in ('owner','manager')))
with check (exists (select 1 from public.caterer_memberships m where m.caterer_id = dishes.caterer_id and m.user_id = auth.uid() and m.role in ('owner','manager')));

create policy "Members can view event menus" on public.event_menu_items for select to authenticated
using (private.is_caterer_member(caterer_id));
create policy "Managers can manage event menus" on public.event_menu_items for all to authenticated
using (exists (select 1 from public.caterer_memberships m where m.caterer_id = event_menu_items.caterer_id and m.user_id = auth.uid() and m.role in ('owner','manager')))
with check (exists (select 1 from public.caterer_memberships m where m.caterer_id = event_menu_items.caterer_id and m.user_id = auth.uid() and m.role in ('owner','manager')));

create trigger set_menu_categories_updated_at before update on public.menu_categories for each row execute function public.set_updated_at();
create trigger set_dishes_updated_at before update on public.dishes for each row execute function public.set_updated_at();
create trigger set_event_menu_items_updated_at before update on public.event_menu_items for each row execute function public.set_updated_at();