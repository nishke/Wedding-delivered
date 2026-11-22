drop policy "Managers can manage menu categories" on public.menu_categories;
create policy "Managers can insert menu categories" on public.menu_categories for insert to authenticated
with check (exists (select 1 from public.caterer_memberships m where m.caterer_id = menu_categories.caterer_id and m.user_id = (select auth.uid()) and m.role in ('owner','manager')));
create policy "Managers can update menu categories" on public.menu_categories for update to authenticated
using (exists (select 1 from public.caterer_memberships m where m.caterer_id = menu_categories.caterer_id and m.user_id = (select auth.uid()) and m.role in ('owner','manager')))
with check (exists (select 1 from public.caterer_memberships m where m.caterer_id = menu_categories.caterer_id and m.user_id = (select auth.uid()) and m.role in ('owner','manager')));
create policy "Managers can delete menu categories" on public.menu_categories for delete to authenticated
using (exists (select 1 from public.caterer_memberships m where m.caterer_id = menu_categories.caterer_id and m.user_id = (select auth.uid()) and m.role in ('owner','manager')));

drop policy "Managers can manage dishes" on public.dishes;
create policy "Managers can insert dishes" on public.dishes for insert to authenticated
with check (exists (select 1 from public.caterer_memberships m where m.caterer_id = dishes.caterer_id and m.user_id = (select auth.uid()) and m.role in ('owner','manager')));
create policy "Managers can update dishes" on public.dishes for update to authenticated
using (exists (select 1 from public.caterer_memberships m where m.caterer_id = dishes.caterer_id and m.user_id = (select auth.uid()) and m.role in ('owner','manager')))
with check (exists (select 1 from public.caterer_memberships m where m.caterer_id = dishes.caterer_id and m.user_id = (select auth.uid()) and m.role in ('owner','manager')));
create policy "Managers can delete dishes" on public.dishes for delete to authenticated
using (exists (select 1 from public.caterer_memberships m where m.caterer_id = dishes.caterer_id and m.user_id = (select auth.uid()) and m.role in ('owner','manager')));

drop policy "Managers can manage event menus" on public.event_menu_items;
create policy "Managers can insert event menus" on public.event_menu_items for insert to authenticated
with check (exists (select 1 from public.caterer_memberships m where m.caterer_id = event_menu_items.caterer_id and m.user_id = (select auth.uid()) and m.role in ('owner','manager')));
create policy "Managers can update event menus" on public.event_menu_items for update to authenticated
using (exists (select 1 from public.caterer_memberships m where m.caterer_id = event_menu_items.caterer_id and m.user_id = (select auth.uid()) and m.role in ('owner','manager')))
with check (exists (select 1 from public.caterer_memberships m where m.caterer_id = event_menu_items.caterer_id and m.user_id = (select auth.uid()) and m.role in ('owner','manager')));
create policy "Managers can delete event menus" on public.event_menu_items for delete to authenticated
using (exists (select 1 from public.caterer_memberships m where m.caterer_id = event_menu_items.caterer_id and m.user_id = (select auth.uid()) and m.role in ('owner','manager')));

create index dishes_category_caterer_fk_idx on public.dishes(category_id,caterer_id);
create index event_menu_dish_caterer_fk_idx on public.event_menu_items(dish_id,caterer_id);
create index event_menu_function_caterer_fk_idx on public.event_menu_items(event_function_id,caterer_id);
create index event_expenses_recorded_by_idx on public.event_expenses(recorded_by);