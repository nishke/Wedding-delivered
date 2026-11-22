create index if not exists event_assignments_assigned_by_idx on public.event_assignments(assigned_by);
create index if not exists event_assignments_event_caterer_idx on public.event_assignments(event_id,caterer_id);
create index if not exists event_closeouts_event_caterer_fk_idx on public.event_closeouts(event_id,caterer_id);
