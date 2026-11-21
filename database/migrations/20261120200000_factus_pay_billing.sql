-- Migración de pasarela de pagos de suscripciones: Wompi -> Factus Pay (Bre-B).

alter table public.payments
  add column if not exists provider_metadata jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists payments_pending_factus_lookup_idx
  on public.payments (user_id, plan_id, billing_period, created_at desc)
  where status = 'pendiente' and provider = 'factus_pay';

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
  if amount_value < 1000 or amount_value > 12100000 then
    raise exception 'El monto del plan está fuera del rango permitido por Factus Pay ($1.000 a $12.100.000 COP).';
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

create or replace function public.create_checkout_intent(
  p_plan_id text,
  p_billing_period text default 'monthly'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.create_factus_checkout_intent(p_plan_id, p_billing_period, false);
end;
$$;

create or replace function public.apply_factus_payment(
  p_reference text,
  p_status text,
  p_amount numeric,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_row public.payments;
  current_row public.subscriptions;
  period_end timestamptz;
  starts_at timestamptz := now();
  action_name text := 'activated';
  new_subscription_id uuid;
  normalized_status text := lower(coalesce(p_status, ''));
  approved boolean := normalized_status in ('paid', 'approved');
  failed boolean := normalized_status in ('failed', 'declined', 'voided', 'error', 'expired');
  merged_meta jsonb;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'No autorizado.';
  end if;

  select * into payment_row
  from public.payments
  where provider_reference = p_reference
  for update;

  if not found then
    raise exception 'No existe un pago con esa referencia.';
  end if;

  merged_meta := coalesce(payment_row.provider_metadata, '{}'::jsonb) || coalesce(p_metadata, '{}'::jsonb);

  if payment_row.status = 'pagado' then
    if p_metadata is not null and p_metadata <> '{}'::jsonb then
      update public.payments
      set provider_metadata = merged_meta,
          updated_at = now()
      where id = payment_row.id;
    end if;
    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'approved', true,
      'subscription_id', payment_row.subscription_id
    );
  end if;

  if not approved then
    update public.payments
    set status = case when failed then 'fallido' else status end,
        raw_status = coalesce(nullif(p_status, ''), raw_status),
        provider_metadata = merged_meta,
        updated_at = now()
    where id = payment_row.id;
    return jsonb_build_object(
      'ok', true,
      'approved', false,
      'status', normalized_status
    );
  end if;

  if p_amount is null or round(p_amount, 2) is distinct from round(payment_row.amount, 2) then
    raise exception 'El monto pagado no coincide con el plan.';
  end if;

  perform public.expire_lapsed_subscription(payment_row.user_id);

  select * into current_row
  from public.subscriptions
  where user_id = payment_row.user_id
    and status = 'active'
  order by created_at desc
  limit 1
  for update;

  if current_row.id is not null
    and current_row.plan_id = payment_row.plan_id
    and current_row.current_period_end is not null
    and current_row.current_period_end > now() then
    starts_at := current_row.current_period_end;
    action_name := 'renewed';
  end if;

  period_end := starts_at + case
    when payment_row.billing_period = 'yearly' then interval '1 year'
    else interval '1 month'
  end;

  if action_name = 'renewed' then
    update public.subscriptions
    set current_period_end = period_end,
        billing_period = coalesce(payment_row.billing_period, billing_period),
        source = 'factus_pay',
        cancelled_at = null,
        updated_at = now()
    where id = current_row.id
    returning id into new_subscription_id;
  else
    if current_row.id is not null then
      update public.subscriptions
      set status = 'replaced', updated_at = now()
      where id = current_row.id;
    end if;
    insert into public.subscriptions (
      user_id, plan_id, status, billing_period, started_at, current_period_end, source
    ) values (
      payment_row.user_id,
      payment_row.plan_id,
      'active',
      coalesce(payment_row.billing_period, 'monthly'),
      now(),
      period_end,
      'factus_pay'
    )
    returning id into new_subscription_id;
  end if;

  update public.payments
  set status = 'pagado',
      payment_method = 'bre-b',
      provider = 'factus_pay',
      raw_status = 'paid',
      provider_transaction_id = coalesce(
        nullif(p_metadata->>'breb_key', ''),
        provider_transaction_id,
        p_reference
      ),
      provider_metadata = merged_meta,
      subscription_id = new_subscription_id,
      transaction_type = case when action_name = 'renewed' then 'renovacion' else 'alta' end,
      updated_at = now()
  where id = payment_row.id;

  insert into public.subscription_events (
    user_id, subscription_id, payment_id, plan_id, action, source,
    billing_period, starts_at, ends_at, reason
  ) values (
    payment_row.user_id,
    new_subscription_id,
    payment_row.id,
    payment_row.plan_id,
    action_name,
    'factus_pay',
    payment_row.billing_period,
    case when action_name = 'renewed' then current_row.current_period_end else now() end,
    period_end,
    'Pago aprobado en Factus Pay (Bre-B).'
  );

  return jsonb_build_object(
    'ok', true,
    'approved', true,
    'subscription_id', new_subscription_id,
    'ends_at', period_end
  );
end;
$$;

create or replace function public.subscribe_to_plan(
  p_plan_id text,
  p_billing_period text default 'monthly'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_row public.plans;
begin
  if auth.uid() is null then
    raise exception 'No autorizado.';
  end if;
  select * into plan_row from public.plans where id = p_plan_id and is_active;
  if not found then
    raise exception 'Plan no encontrado.';
  end if;
  if plan_row.purchasable then
    raise exception 'El pago de este plan se confirma con Factus Pay.';
  end if;
  raise exception 'Este plan solo lo asigna un administrador.';
end;
$$;

revoke all on function public.create_factus_checkout_intent(text, text, boolean) from public, anon;
grant execute on function public.create_factus_checkout_intent(text, text, boolean) to authenticated;

revoke all on function public.create_checkout_intent(text, text) from public, anon;
grant execute on function public.create_checkout_intent(text, text) to authenticated;

revoke all on function public.apply_factus_payment(text, text, numeric, jsonb) from public, anon, authenticated;
grant execute on function public.apply_factus_payment(text, text, numeric, jsonb) to service_role;
