create or replace function public.validate_payment_booking_customer()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_customer uuid;
begin
  if new.booking_id is not null then
    select e.customer_id into v_customer
    from public.events e
    where e.id=new.booking_id and e.caterer_id=new.caterer_id;
    if not found or v_customer is distinct from new.customer_id then
      raise exception 'The selected booking must belong to this customer and workspace.';
    end if;
  end if;
  return new;
end;
$$;
create trigger validate_payment_booking_customer_before_write
before insert or update of booking_id,customer_id,caterer_id
on public.customer_payments
for each row execute function public.validate_payment_booking_customer();