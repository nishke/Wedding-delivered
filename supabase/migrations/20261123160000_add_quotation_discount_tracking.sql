alter table public.event_quotations
  add column if not exists discount_type text not null default 'none',
  add column if not exists discount_value numeric not null default 0,
  add column if not exists discount_amount numeric not null default 0,
  add column if not exists concession_reason text;

alter table public.event_quotations
  add constraint event_quotations_discount_type_check
  check (discount_type in ('none','percentage','fixed')),
  add constraint event_quotations_discount_value_check
  check (discount_value >= 0),
  add constraint event_quotations_discount_amount_check
  check (discount_amount >= 0 and discount_amount <= subtotal);
