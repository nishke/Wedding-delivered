create or replace function public.set_booking_advance_amount()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.agreed_amount is not null and new.agreed_amount > 0 then
    new.agreed_advance_amount := round(new.agreed_amount * new.advance_percentage / 100, 2);
  else
    new.agreed_advance_amount := 0;
  end if;
  return new;
end;
$$;
create trigger set_booking_advance_amount_before_write
before insert or update of agreed_amount, advance_percentage
on public.events
for each row execute function public.set_booking_advance_amount();