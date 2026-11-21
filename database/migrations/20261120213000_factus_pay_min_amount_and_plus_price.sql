-- Ajusta el monto mínimo validado para Factus Pay ($10.000 COP reales en el API)
-- y actualiza el plan Plus mensual de $9.900 a $10.000 COP para permitir el cobro.

update public.plans
set monthly_price = 10000,
    updated_at = now()
where id = 'plus'
  and monthly_price < 10000;

create or replace function public.create_factus_checkout_intent(
  p_plan_id text,
  p_billing_period text default 'monthly',
  p_force_new boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  plan_row public.plans;
  existing_payment public.payments;
  period text := case when p_billing_period = 'yearly' then 'yearly' else 'monthly' end;
  amount_value numeric;
  reference text;
begin
  if uid is null then
    raise exception 'No autorizado.';
  end if;

  select * into plan_row
  from public.plans
  where id = p_plan_id
    and is_active;

  if not found then
    raise exception 'Plan no encontrado.';
  end if;
  if plan_row.purchasable is not true then
    raise exception 'Este plan no se compra en la app. Si es Enterprise, lo asigna un administrador.';
  end if;

  amount_value := case when period = 'yearly' then plan_row.yearly_price else plan_row.monthly_price end;
  if amount_value is null or amount_value <= 0 then
    raise exception 'Este plan todavía no tiene un precio en pesos.';
  end if;
  if amount_value < 10000 or amount_value > 12100000 then
    raise exception 'El monto del plan está fuera del rango permitido por Factus Pay ($10.000 a $12.100.000 COP).';
  end if;

  if not coalesce(p_force_new, false) then
    select * into existing_payment
    from public.payments
    where user_id = uid
      and plan_id = plan_row.id
      and billing_period = period
      and provider = 'factus_pay'
      and status = 'pendiente'
      and round(amount, 2) = round(amount_value, 2)
      and created_at >= now() - interval '30 minutes'
    order by created_at desc
    limit 1;

    if found and existing_payment.provider_reference is not null then
      return jsonb_build_object(
        'reference', existing_payment.provider_reference,
        'amount', round(existing_payment.amount, 2),
        'amount_in_cents', round(existing_payment.amount * 100)::bigint,
        'currency', coalesce(existing_payment.currency, 'COP'),
        'plan_id', plan_row.id,
        'plan_name', plan_row.name,
        'billing_period', period,
        'reused', true
      );
    end if;
  end if;

  reference := 'buddy' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 20);
  insert into public.payments (
    user_id, plan_id, transaction_type, status, amount, payment_method,
    currency, provider, provider_reference, billing_period, raw_status, provider_metadata, updated_at
  ) values (
    uid, plan_row.id, 'alta', 'pendiente', amount_value, 'bre-b',
    'COP', 'factus_pay', reference, period, 'ready', '{}'::jsonb, now()
  );

  return jsonb_build_object(
    'reference', reference,
    'amount', round(amount_value, 2),
    'amount_in_cents', round(amount_value * 100)::bigint,
    'currency', 'COP',
    'plan_id', plan_row.id,
    'plan_name', plan_row.name,
    'billing_period', period,
    'reused', false
  );
end;
$$;

revoke all on function public.create_factus_checkout_intent(text, text, boolean) from public, anon;
grant execute on function public.create_factus_checkout_intent(text, text, boolean) to authenticated;
