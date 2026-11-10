-- Descuentos en ofertas comerciales (productos y servicios).

alter table public.offers
  add column if not exists original_price_amount bigint,
  add column if not exists discount_percent integer;

alter table public.offers
  drop constraint if exists offers_discount_percent_check;

alter table public.offers
  add constraint offers_discount_percent_check
  check (
    discount_percent is null
    or (discount_percent >= 1 and discount_percent <= 99)
  );

