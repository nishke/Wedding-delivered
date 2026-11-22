create index if not exists event_closeouts_caterer_idx on public.event_closeouts(caterer_id);
create index if not exists event_closeouts_closed_by_idx on public.event_closeouts(closed_by);