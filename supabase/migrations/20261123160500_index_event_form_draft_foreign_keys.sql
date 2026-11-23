create index if not exists event_form_drafts_caterer_idx on public.event_form_drafts(caterer_id);
create index if not exists event_form_drafts_event_caterer_idx on public.event_form_drafts(event_id,caterer_id);
