create or replace function public.create_concession_revision(
  p_quotation_id uuid,
  p_additional_concession numeric
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_quote public.event_quotations%rowtype;
  v_role text;
  v_new_id uuid;
  v_new_revision integer;
  v_discount numeric;
  v_discounted numeric;
  v_gst numeric;
  v_total numeric;
begin
  if v_user is null then raise exception 'Sign in is required.'; end if;
  if p_additional_concession is null or p_additional_concession <= 0 then
    raise exception 'Enter a concession greater than zero.';
  end if;

  select q.* into v_quote from public.event_quotations q
  where q.id = p_quotation_id for update;
  if not found or not private.is_caterer_member(v_quote.caterer_id) then
    raise exception 'Quotation not found or access denied.';
  end if;

  select m.role into v_role from public.caterer_memberships m
  where m.caterer_id=v_quote.caterer_id and m.user_id=v_user;
  if v_role not in ('owner','manager') then
    raise exception 'Only an owner or manager can revise a quotation.';
  end if;
  if v_quote.status <> 'sent' then
    raise exception 'Only the current sent quotation can receive a concession revision.';
  end if;

  v_discount := v_quote.discount_amount + p_additional_concession;
  if v_discount > v_quote.subtotal then
    raise exception 'Total concession cannot exceed the quotation subtotal.';
  end if;
  v_discounted := v_quote.subtotal - v_discount;
  v_gst := case
    when not v_quote.gst_applicable then 0
    when v_quote.gst_inclusive then round(v_discounted*v_quote.gst_rate/(100+v_quote.gst_rate),2)
    else round(v_discounted*v_quote.gst_rate/100,2)
  end;
  v_total := case
    when not v_quote.gst_applicable or v_quote.gst_inclusive then v_discounted
    else v_discounted+v_gst
  end;

  select coalesce(max(revision),0)+1 into v_new_revision
  from public.event_quotations
  where event_id=v_quote.event_id and caterer_id=v_quote.caterer_id;

  insert into public.event_quotations(
    caterer_id,event_id,revision,pricing_model,guest_count,subtotal,
    gst_applicable,gst_rate,gst_inclusive,gst_amount,total_amount,status,
    customer_notes,internal_notes,created_by,discount_type,discount_value,
    discount_amount,concession_reason
  ) values (
    v_quote.caterer_id,v_quote.event_id,v_new_revision,v_quote.pricing_model,
    v_quote.guest_count,v_quote.subtotal,v_quote.gst_applicable,v_quote.gst_rate,
    v_quote.gst_inclusive,v_gst,v_total,'draft',v_quote.customer_notes,
    v_quote.internal_notes,v_user,'fixed',v_discount,v_discount,
    v_quote.concession_reason
  ) returning id into v_new_id;

  insert into public.event_quotation_items(
    caterer_id,quotation_id,description,quantity,unit,unit_price,sort_order
  )
  select caterer_id,v_new_id,description,quantity,unit,unit_price,sort_order
  from public.event_quotation_items
  where quotation_id=v_quote.id and caterer_id=v_quote.caterer_id;

  update public.event_quotations set status='superseded'
  where id=v_quote.id and caterer_id=v_quote.caterer_id;

  insert into public.event_activity(
    caterer_id,event_id,actor_id,activity_type,description,metadata
  ) values (
    v_quote.caterer_id,v_quote.event_id,v_user,'quotation_revised',
    'Quotation revision '||v_new_revision||' created with an additional concession of '||p_additional_concession||'.',
    jsonb_build_object(
      'previous_quotation_id',v_quote.id,'quotation_id',v_new_id,
      'revision',v_new_revision,'additional_concession',p_additional_concession,
      'total_concession',v_discount,'total_amount',v_total
    )
  );

  return v_new_id;
end;
$function$;

revoke all on function public.create_concession_revision(uuid,numeric) from public,anon;
grant execute on function public.create_concession_revision(uuid,numeric) to authenticated;
