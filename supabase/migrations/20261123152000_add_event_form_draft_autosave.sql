-- Persist in-progress event forms per authenticated user. Drafts are private
-- to their author and only visible within their authorised event scope.

create table if not exists public.event_form_drafts (
  id uuid primary key default gen_random_uuid(),
  caterer_id uuid not null references public.caterers(id) on delete cascade,
  event_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  draft_key text not null default 'event-detail',
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(event_id,user_id,draft_key),
  constraint event_form_drafts_event_fk foreign key(event_id,caterer_id)
    references public.events(id,caterer_id) on delete cascade,
  constraint event_form_drafts_key_check check (length(draft_key) between 1 and 80),
  constraint event_form_drafts_payload_check check (jsonb_typeof(payload)='object')
);

create index if not exists event_form_drafts_user_event_idx
  on public.event_form_drafts(user_id,event_id);

alter table public.event_form_drafts enable row level security;

grant select,insert,update,delete on public.event_form_drafts to authenticated;

create policy "Members can read own event drafts" on public.event_form_drafts
for select to authenticated using (
 user_id=(select auth.uid()) and private.is_caterer_member(caterer_id)
 and (
   exists(select 1 from public.caterer_memberships m where m.caterer_id=event_form_drafts.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager'))
   or private.is_event_assigned(event_id,caterer_id)
 )
);

create policy "Members can create own event drafts" on public.event_form_drafts
for insert to authenticated with check (
 user_id=(select auth.uid()) and private.is_caterer_member(caterer_id)
 and (
   exists(select 1 from public.caterer_memberships m where m.caterer_id=event_form_drafts.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager'))
   or private.is_event_assigned(event_id,caterer_id)
 )
);

create policy "Members can update own event drafts" on public.event_form_drafts
for update to authenticated using (
 user_id=(select auth.uid()) and private.is_caterer_member(caterer_id)
 and (
   exists(select 1 from public.caterer_memberships m where m.caterer_id=event_form_drafts.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager'))
   or private.is_event_assigned(event_id,caterer_id)
 )
) with check (
 user_id=(select auth.uid()) and private.is_caterer_member(caterer_id)
 and (
   exists(select 1 from public.caterer_memberships m where m.caterer_id=event_form_drafts.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager'))
   or private.is_event_assigned(event_id,caterer_id)
 )
);

create policy "Members can delete own event drafts" on public.event_form_drafts
for delete to authenticated using (
 user_id=(select auth.uid()) and private.is_caterer_member(caterer_id)
 and (
   exists(select 1 from public.caterer_memberships m where m.caterer_id=event_form_drafts.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager'))
   or private.is_event_assigned(event_id,caterer_id)
 )
);
