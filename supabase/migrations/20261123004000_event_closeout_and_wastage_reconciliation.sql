create table if not exists public.event_closeouts (
 id uuid primary key default gen_random_uuid(), caterer_id uuid not null references public.caterers(id) on delete cascade,
 event_id uuid not null, leftovers_notes text, wastage_notes text, closure_notes text,
 closed_by uuid references auth.users(id) on delete set null, closed_at timestamptz not null default now(),
 unique(event_id), constraint event_closeout_event_caterer_fk foreign key(event_id,caterer_id) references public.events(id,caterer_id) on delete cascade
);
create index if not exists event_closeouts_caterer_closed_idx on public.event_closeouts(caterer_id,closed_at desc);
alter table public.event_closeouts enable row level security;
create policy event_closeouts_member_select on public.event_closeouts for select to authenticated using ((select private.is_caterer_member(caterer_id)));
create policy event_closeouts_manager_insert on public.event_closeouts for insert to authenticated with check ((select private.is_caterer_member(caterer_id)) and exists(select 1 from public.caterer_memberships m where m.caterer_id=event_closeouts.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));
create policy event_closeouts_manager_update on public.event_closeouts for update to authenticated using (exists(select 1 from public.caterer_memberships m where m.caterer_id=event_closeouts.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager'))) with check (exists(select 1 from public.caterer_memberships m where m.caterer_id=event_closeouts.caterer_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));
create policy event_closeouts_owner_delete on public.event_closeouts for delete to authenticated using ((select private.is_caterer_owner(caterer_id)));
create or replace function public.close_event(p_event_id uuid,p_final_guest_count integer,p_leftovers_notes text default null,p_wastage_notes text default null,p_closure_notes text default null)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_event public.events%rowtype;v_user_id uuid:=auth.uid();v_closeout_id uuid;
begin
 if v_user_id is null then raise exception 'Authentication required.';end if;
 select * into v_event from public.events where id=p_event_id for update;
 if not found or not private.is_caterer_member(v_event.caterer_id) then raise exception 'Event not found or access denied.';end if;
 if not exists(select 1 from public.caterer_memberships m where m.caterer_id=v_event.caterer_id and m.user_id=v_user_id and m.role in ('owner','manager')) then raise exception 'Only owners and managers can close an event.';end if;
 if v_event.status='cancelled' then raise exception 'A cancelled event cannot be closed as completed.';end if;
 if v_event.status='closed' then raise exception 'This event is already closed.';end if;
 if p_final_guest_count is null or p_final_guest_count<1 then raise exception 'Final guest count must be at least one.';end if;
 update public.events set final_guest_count=p_final_guest_count,status='closed' where id=p_event_id;
 insert into public.event_closeouts(caterer_id,event_id,leftovers_notes,wastage_notes,closure_notes,closed_by)
 values(v_event.caterer_id,p_event_id,nullif(trim(p_leftovers_notes),''),nullif(trim(p_wastage_notes),''),nullif(trim(p_closure_notes),''),v_user_id) returning id into v_closeout_id;
 insert into public.event_activity(caterer_id,event_id,actor_id,activity_type,description,metadata)
 values(v_event.caterer_id,p_event_id,v_user_id,'event_closed','Event closed and final guest count recorded.',jsonb_build_object('final_guest_count',p_final_guest_count,'closeout_id',v_closeout_id));
 return v_closeout_id;
end;$$;
revoke all on function public.close_event(uuid,integer,text,text,text) from public,anon;
grant execute on function public.close_event(uuid,integer,text,text,text) to authenticated;