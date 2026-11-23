create unique index if not exists event_quotations_one_accepted_per_event
  on public.event_quotations(event_id) where status = 'accepted';

create or replace function public.accept_quotation(
  p_quotation_id uuid,
  p_agreed_amount numeric
) returns void
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_quote public.event_quotations%rowtype;
  v_role text;
begin
  if v_user is null then raise exception 'Sign in is required.'; end if;
  if p_agreed_amount is null or p_agreed_amount <= 0 then
    raise exception 'Enter an agreed booking amount greater than zero.';
  end if;

  select q.* into v_quote
  from public.event_quotations q
  where q.id = p_quotation_id
  for update;

  if not found or not private.is_caterer_member(v_quote.caterer_id) then
    raise exception 'Quotation not found or access denied.';
  end if;

  select m.role into v_role
  from public.caterer_memberships m
  where m.caterer_id = v_quote.caterer_id and m.user_id = v_user;
  if v_role not in ('owner','manager') then
    raise exception 'Only an owner or manager can accept a quotation.';
  end if;
  if v_quote.status <> 'sent' then
    raise exception 'Only a sent quotation can be accepted.';
  end if;

  perform 1 from public.events e
  where e.id = v_quote.event_id and e.caterer_id = v_quote.caterer_id
    and e.status not in ('cancelled','closed')
  for update;
  if not found then raise exception 'This event cannot accept a quotation in its current state.'; end if;

  update public.event_quotations
  set status = 'superseded'
  where event_id = v_quote.event_id
    and caterer_id = v_quote.caterer_id
    and status = 'sent'
    and id <> v_quote.id;

  update public.event_quotations set status = 'accepted'
  where id = v_quote.id and caterer_id = v_quote.caterer_id;

  update public.events set agreed_amount = p_agreed_amount
  where id = v_quote.event_id and caterer_id = v_quote.caterer_id;

  insert into public.event_activity(caterer_id,event_id,actor_id,activity_type,description,metadata)
  values (
    v_quote.caterer_id,
    v_quote.event_id,
    v_user,
    'quotation_accepted',
    'Quotation revision ' || v_quote.revision || ' accepted. Agreed booking amount set to ' || p_agreed_amount || '.',
    jsonb_build_object('quotation_id',v_quote.id,'revision',v_quote.revision,
      'quotation_total',v_quote.total_amount,'agreed_amount',p_agreed_amount)
  );
end;
$function$;

revoke all on function public.accept_quotation(uuid,numeric) from public, anon;
grant execute on function public.accept_quotation(uuid,numeric) to authenticated;
