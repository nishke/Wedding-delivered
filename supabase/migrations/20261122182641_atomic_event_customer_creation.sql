create or replace function public.create_event_with_customer(
  p_caterer_id uuid,
  p_customer_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_event_name text,
  p_event_type text,
  p_event_date date,
  p_venue text,
  p_expected_guest_count integer,
  p_quoted_amount numeric,
  p_status text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_event_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not private.is_caterer_member(p_caterer_id) then
    raise exception 'You do not have access to this catering workspace.';
  end if;

  if p_customer_id is null then
    if nullif(trim(p_customer_name), '') is null then
      raise exception 'Customer name is required.';
    end if;
    insert into public.customers (caterer_id, full_name, phone)
    values (p_caterer_id, trim(p_customer_name), nullif(trim(p_customer_phone), ''))
    returning id into v_customer_id;
  else
    select c.id into v_customer_id
    from public.customers c
    where c.id = p_customer_id and c.caterer_id = p_caterer_id;
    if v_customer_id is null then
      raise exception 'The selected customer does not belong to this workspace.';
    end if;
  end if;

  insert into public.events (
    caterer_id, customer_id, event_name, event_type, event_date, venue,
    expected_guest_count, quoted_amount, status, created_by
  )
  values (
    p_caterer_id, v_customer_id, trim(p_event_name), p_event_type, p_event_date,
    nullif(trim(p_venue), ''), p_expected_guest_count, coalesce(p_quoted_amount, 0),
    p_status, v_user_id
  )
  returning id into v_event_id;

  insert into public.event_activity (
    caterer_id, event_id, actor_id, activity_type, description, metadata
  )
  values (
    p_caterer_id, v_event_id, v_user_id, 'event_created',
    'Event record created with status ' || replace(p_status, '_', ' ') || '.',
    jsonb_build_object('status', p_status)
  );

  return v_event_id;
end;
$$;

revoke all on function public.create_event_with_customer(uuid, uuid, text, text, text, text, date, text, integer, numeric, text) from public, anon;
grant execute on function public.create_event_with_customer(uuid, uuid, text, text, text, text, date, text, integer, numeric, text) to authenticated;
