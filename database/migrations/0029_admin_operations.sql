-- Costos estimados, promociones, permisos de equipo y auditoría del panel.

alter table public.profiles
  add column if not exists admin_permissions jsonb not null default '[]'::jsonb;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('USER', 'ADMIN', 'SUPER_ADMIN', 'SUPERADMIN'));

alter table public.offers
  add column if not exists promotion_status text not null default 'none';

alter table public.offers drop constraint if exists offers_promotion_status_check;
alter table public.offers
  add constraint offers_promotion_status_check
  check (promotion_status in ('none', 'pending', 'approved', 'paused'));

update public.offers
set promotion_status = 'approved'
where is_promoted is true
  and promotion_status = 'none';

update public.plans
set entitlements = entitlements || jsonb_build_object(
  'signatures', null,
  'documentJobs', null,
  'transcriptionMinutes', null
)
where not (entitlements ? 'signatures');

insert into public.app_settings (key, value)
values
  ('cost_ai_credit_usd', '0.002'),
  ('cost_call_minute_usd', '0.01'),
  ('cost_storage_gb_usd', '0.02'),
  ('cost_egress_gb_usd', '0.09'),
  ('cost_realtime_minute_usd', '0.004'),
  ('cost_backend_user_usd', '0.03'),
  ('cost_otp_usd', '0.05'),
  ('cost_cop_per_usd', '4000'),
  ('cost_alert_free_usd', '0.25'),
  ('cost_alert_plus_usd', '0.75'),
  ('cost_alert_pro_usd', '1.00'),
  ('ios_min_version', '1.0.0'),
  ('android_min_version', '1.0.0'),
  ('web_min_version', '1.0.0'),
  ('admob_enabled', 'false'),
  ('admob_frequency', '3'),
  ('admob_placements', 'chats,estados,beeservices')
on conflict (key) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('ADMIN', 'SUPER_ADMIN', 'SUPERADMIN')
  );
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (
        role in ('SUPERADMIN', 'SUPER_ADMIN')
        or (
          role = 'ADMIN'
          and not exists (
            select 1
            from public.profiles
            where role in ('SUPERADMIN', 'SUPER_ADMIN')
          )
        )
      )
  );
$$;

create or replace function public.assert_superadmin()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'Solo un superadministrador puede hacer este cambio.';
  end if;
end;
$$;

revoke all on function public.is_superadmin() from public, anon;
revoke all on function public.assert_superadmin() from public, anon;
grant execute on function public.is_superadmin() to authenticated;
grant execute on function public.assert_superadmin() to authenticated;

create or replace function public.admin_audit_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'profiles' and tg_op = 'UPDATE' then
    if new.account_status is distinct from old.account_status
      or new.role is distinct from old.role then
      insert into public.activity_log (actor_id, entity, entity_id, action, payload)
      values (
        auth.uid(),
        'profiles',
        new.id,
        'update',
        jsonb_build_object(
          'account_status', new.account_status,
          'previous_status', old.account_status,
          'role', new.role,
          'previous_role', old.role
        )
      );
    end if;
  elsif tg_table_name = 'plans' and tg_op = 'UPDATE' then
    insert into public.activity_log (actor_id, entity, action, payload)
    values (
      auth.uid(),
      'plans',
      'update',
      jsonb_build_object('planId', new.id, 'name', new.name)
    );
  elsif tg_table_name = 'payments' and tg_op = 'UPDATE'
    and new.status is distinct from old.status then
    insert into public.activity_log (actor_id, entity, entity_id, action, payload)
    values (
      auth.uid(),
      'payments',
      new.id,
      'status',
      jsonb_build_object('status', new.status, 'previous', old.status)
    );
  elsif tg_table_name = 'app_settings' then
    insert into public.activity_log (actor_id, entity, action, payload)
    values (
      auth.uid(),
      'app_settings',
      lower(tg_op),
      jsonb_build_object('key', new.key)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists admin_audit_profiles on public.profiles;
create trigger admin_audit_profiles
after update of account_status, role on public.profiles
for each row execute function public.admin_audit_change();

drop trigger if exists admin_audit_plans on public.plans;
create trigger admin_audit_plans
after update on public.plans
for each row execute function public.admin_audit_change();

drop trigger if exists admin_audit_payments on public.payments;
create trigger admin_audit_payments
after update of status on public.payments
for each row execute function public.admin_audit_change();

drop trigger if exists admin_audit_settings on public.app_settings;
create trigger admin_audit_settings
after insert or update on public.app_settings
for each row execute function public.admin_audit_change();

create or replace function public.admin_setting_number(p_key text, p_default numeric)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select nullif(btrim(value), '')::numeric
    from public.app_settings
    where key = p_key
  ), p_default);
$$;

create or replace function public.admin_cost_report()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ai_price numeric := public.admin_setting_number('cost_ai_credit_usd', 0.002);
  call_price numeric := public.admin_setting_number('cost_call_minute_usd', 0.01);
  storage_price numeric := public.admin_setting_number('cost_storage_gb_usd', 0.02);
  egress_price numeric := public.admin_setting_number('cost_egress_gb_usd', 0.09);
  realtime_price numeric := public.admin_setting_number('cost_realtime_minute_usd', 0.004);
  backend_price numeric := public.admin_setting_number('cost_backend_user_usd', 0.03);
  otp_price numeric := public.admin_setting_number('cost_otp_usd', 0.05);
  cop_per_usd numeric := greatest(public.admin_setting_number('cost_cop_per_usd', 4000), 1);
  month_start date := date_trunc('month', current_date)::date;
  result jsonb;
begin
  perform public.assert_admin();

  with usage as (
    select
      user_id,
      coalesce(sum(used) filter (where metric = 'aiCredits'), 0) as ai,
      coalesce(sum(used) filter (where metric = 'callMinutes'), 0) as calls,
      coalesce(sum(used) filter (where metric = 'egressGb'), 0) as egress,
      coalesce(sum(used) filter (where metric = 'realtimeMinutes'), 0) as realtime,
      coalesce(sum(used) filter (where metric = 'otp'), 0) as otp
    from public.usage_meters
    where period_start = month_start
    group by user_id
  ),
  storage as (
    select owner_id, coalesce(sum(size_bytes), 0)::numeric / 1073741824 as gb
    from public.files
    where trashed_at is null
      and kind = 'file'
    group by owner_id
  ),
  active_plan as (
    select distinct on (user_id) user_id, plan_id
    from public.subscriptions
    where status = 'active'
    order by user_id, created_at desc
  ),
  people as (
    select
      profile.id,
      profile.created_at,
      profile.account_status,
      coalesce(active_plan.plan_id, 'free') as plan_id,
      coalesce(usage.ai, 0) as ai,
      coalesce(usage.calls, 0) as calls,
      coalesce(storage.gb, profile.storage_used_bytes::numeric / 1073741824, 0) as storage_gb,
      coalesce(usage.egress, 0) as egress,
      coalesce(usage.realtime, 0) as realtime,
      coalesce(usage.otp, 0) as otp
    from public.profiles profile
    left join active_plan on active_plan.user_id = profile.id
    left join usage on usage.user_id = profile.id
    left join storage on storage.owner_id = profile.id
  ),
  priced as (
    select
      people.*,
      people.ai * ai_price
        + people.calls * call_price
        + people.storage_gb * storage_price
        + people.egress * egress_price
        + people.realtime * realtime_price
        + people.otp * otp_price
        + case when people.account_status = 'activo' then backend_price else 0 end as total_cost
    from people
  ),
  plan_rows as (
    select
      plan_id,
      count(*) filter (where account_status = 'activo') as active_users,
      coalesce(sum(ai * ai_price), 0) as ai_cost,
      coalesce(sum(calls * call_price), 0) as call_cost,
      coalesce(sum(storage_gb * storage_price), 0) as storage_cost,
      coalesce(sum(total_cost), 0) as total_cost
    from priced
    group by plan_id
  ),
  payments_by_user as (
    select user_id, coalesce(sum(amount), 0) as amount_cop
    from public.payments
    where lower(status) in ('pagado', 'paid', 'approved', 'succeeded')
    group by user_id
  ),
  cohorts as (
    select
      to_char(date_trunc('month', priced.created_at), 'YYYY-MM') as month,
      count(*) as users,
      coalesce(sum(payments_by_user.amount_cop), 0) / cop_per_usd as revenue_usd,
      coalesce(sum(priced.total_cost), 0) as cost_usd
    from priced
    left join payments_by_user on payments_by_user.user_id = priced.id
    group by 1
    order by 1 desc
    limit 12
  )
  select jsonb_build_object(
    'unitPrices', jsonb_build_object(
      'aiCredit', ai_price,
      'callMinute', call_price,
      'storageGb', storage_price,
      'egressGb', egress_price,
      'realtimeMinute', realtime_price,
      'backendUser', backend_price,
      'otp', otp_price,
      'copPerUsd', cop_per_usd
    ),
    'thresholds', jsonb_build_object(
      'free', public.admin_setting_number('cost_alert_free_usd', 0.25),
      'plus', public.admin_setting_number('cost_alert_plus_usd', 0.75),
      'pro', public.admin_setting_number('cost_alert_pro_usd', 1.00)
    ),
    'plans', coalesce((
      select jsonb_agg(jsonb_build_object(
        'planId', plan_rows.plan_id,
        'activeUsers', plan_rows.active_users,
        'aiCost', round(plan_rows.ai_cost, 4),
        'callCost', round(plan_rows.call_cost, 4),
        'storageCost', round(plan_rows.storage_cost, 4),
        'totalCost', round(plan_rows.total_cost, 4),
        'costPerActiveUser', case
          when plan_rows.active_users = 0 then 0
          else round(plan_rows.total_cost / plan_rows.active_users, 4)
        end,
        'overThreshold', case plan_rows.plan_id
          when 'free' then plan_rows.active_users > 0 and plan_rows.total_cost / plan_rows.active_users > public.admin_setting_number('cost_alert_free_usd', 0.25)
          when 'plus' then plan_rows.active_users > 0 and plan_rows.total_cost / plan_rows.active_users > public.admin_setting_number('cost_alert_plus_usd', 0.75)
          when 'pro' then plan_rows.active_users > 0 and plan_rows.total_cost / plan_rows.active_users > public.admin_setting_number('cost_alert_pro_usd', 1.00)
          else false
        end
      ) order by plan_rows.plan_id)
      from plan_rows
    ), '[]'::jsonb),
    'totals', (
      select jsonb_build_object(
        'ai', round(coalesce(sum(ai * ai_price), 0), 4),
        'calls', round(coalesce(sum(calls * call_price), 0), 4),
        'storage', round(coalesce(sum(storage_gb * storage_price), 0), 4),
        'egress', round(coalesce(sum(egress * egress_price), 0), 4),
        'realtime', round(coalesce(sum(realtime * realtime_price), 0), 4),
        'backend', round(coalesce(sum(case when account_status = 'activo' then backend_price else 0 end), 0), 4),
        'otp', round(coalesce(sum(otp * otp_price), 0), 4),
        'total', round(coalesce(sum(total_cost), 0), 4)
      )
      from priced
    ),
    'conversion', (
      select jsonb_build_object(
        'freeUsers', count(*) filter (where plan_id = 'free'),
        'paidUsers', count(*) filter (where plan_id <> 'free'),
        'rate', case
          when count(*) = 0 then 0
          else round(count(*) filter (where plan_id <> 'free')::numeric / count(*), 4)
        end
      )
      from priced
    ),
    'cohorts', coalesce((select jsonb_agg(jsonb_build_object(
      'month', cohorts.month,
      'users', cohorts.users,
      'revenueUsd', round(cohorts.revenue_usd, 2),
      'costUsd', round(cohorts.cost_usd, 2),
      'marginUsd', round(cohorts.revenue_usd - cohorts.cost_usd, 2)
    ) order by cohorts.month desc) from cohorts), '[]'::jsonb)
  ) into result;

  insert into public.activity_log (actor_id, entity, action, payload)
  select
    auth.uid(),
    'costs',
    'cost_alert',
    jsonb_build_object('planId', plan_row->>'planId', 'costPerActiveUser', plan_row->>'costPerActiveUser')
  from jsonb_array_elements(result->'plans') plan_row
  where (plan_row->>'overThreshold')::boolean
    and not exists (
      select 1
      from public.activity_log existing
      where existing.action = 'cost_alert'
        and existing.payload->>'planId' = plan_row->>'planId'
        and existing.created_at::date = current_date
    );

  return result;
end;
$$;

create or replace function public.admin_mark_refund(p_payment_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  perform public.assert_admin();
  if reason is null then
    raise exception 'Escribe el motivo del reembolso.';
  end if;
  update public.payments
  set status = 'reembolsado',
      transaction_type = 'reembolso',
      raw_status = coalesce(raw_status, status)
  where id = p_payment_id;
  if not found then
    raise exception 'No encontramos el pago.';
  end if;
  insert into public.activity_log (actor_id, entity, entity_id, action, payload)
  values (auth.uid(), 'payments', p_payment_id, 'refund', jsonb_build_object('reason', reason));
  return jsonb_build_object('id', p_payment_id, 'estado', 'reembolsado');
end;
$$;

create or replace function public.admin_list_promoted_offers()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', offer.id,
      'title', offer.title,
      'businessName', business.display_name,
      'status', offer.status,
      'promotionStatus', offer.promotion_status,
      'isPromoted', offer.is_promoted,
      'requests', (
        select count(*)
        from public.orders request
        where jsonb_typeof(request.items) = 'array'
          and exists (
            select 1
            from jsonb_array_elements(request.items) item
            where item->>'commercial_offer_id' = offer.id::text
              or item->>'offer_id' = offer.id::text
              or item->>'id' = offer.id::text
          )
      )
    ) order by offer.updated_at desc)
    from public.offers offer
    join public.businesses business on business.id = offer.business_id
    where offer.promotion_status <> 'none' or offer.is_promoted
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_set_offer_promotion(p_offer_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  if p_status not in ('none', 'pending', 'approved', 'paused') then
    raise exception 'Estado de promoción no válido.';
  end if;
  update public.offers
  set promotion_status = p_status,
      is_promoted = p_status = 'approved',
      updated_at = now()
  where id = p_offer_id;
  if not found then
    raise exception 'No encontramos la oferta.';
  end if;
  insert into public.activity_log (actor_id, entity, entity_id, action, payload)
  values (auth.uid(), 'offers', p_offer_id, 'promotion', jsonb_build_object('status', p_status));
  return jsonb_build_object('id', p_offer_id, 'promotionStatus', p_status);
end;
$$;

create or replace function public.admin_list_categories()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', id,
      'name', name,
      'slug', slug,
      'offerType', offer_type,
      'isActive', is_active,
      'sortOrder', sort_order
    ) order by sort_order, name)
    from public.categories
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_save_category(
  p_id uuid,
  p_name text,
  p_offer_type text,
  p_sort_order integer,
  p_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_name text := nullif(btrim(coalesce(p_name, '')), '');
  clean_type text := coalesce(nullif(p_offer_type, ''), 'mixed');
  slug text;
  saved_id uuid;
begin
  perform public.assert_admin();
  if clean_name is null then
    raise exception 'Escribe el nombre de la categoría.';
  end if;
  if clean_type not in ('products', 'services', 'mixed') then
    raise exception 'El tipo de categoría no es válido.';
  end if;
  slug := trim(both '-' from regexp_replace(lower(clean_name), '[^a-z0-9]+', '-', 'g'));
  if p_id is null then
    insert into public.categories (name, slug, normalized_name, offer_type, sort_order, is_active)
    values (clean_name, slug || '-' || substr(gen_random_uuid()::text, 1, 8), lower(clean_name), clean_type, coalesce(p_sort_order, 0), coalesce(p_active, true))
    returning id into saved_id;
  else
    update public.categories
    set name = clean_name,
        normalized_name = lower(clean_name),
        offer_type = clean_type,
        sort_order = coalesce(p_sort_order, sort_order),
        is_active = coalesce(p_active, is_active),
        updated_at = now()
    where id = p_id
    returning id into saved_id;
  end if;
  if saved_id is null then
    raise exception 'No encontramos la categoría.';
  end if;
  insert into public.activity_log (actor_id, entity, entity_id, action, payload)
  values (auth.uid(), 'categories', saved_id, 'save', jsonb_build_object('name', clean_name));
  return jsonb_build_object('id', saved_id);
end;
$$;

create or replace function public.admin_moderation_queue()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  return jsonb_build_object(
    'reports', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', report.id,
        'userId', report.user_id,
        'reason', report.reason,
        'detail', report.detail,
        'content', report.reported_content,
        'status', report.status,
        'createdAt', report.created_at
      ) order by report.created_at desc)
      from (
        select * from public.moderation
        where kind = 'report'
        order by created_at desc
        limit 50
      ) report
    ), '[]'::jsonb),
    'statuses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', status.id,
        'author', trim(profile.first_name || ' ' || profile.last_name),
        'body', left(coalesce(status.body, ''), 180),
        'createdAt', status.created_at,
        'archived', status.archived_at is not null
      ) order by status.created_at desc)
      from (
        select * from public.statuses
        order by created_at desc
        limit 40
      ) status
      join public.profiles profile on profile.id = status.author_id
    ), '[]'::jsonb),
    'businesses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', business.id,
        'name', business.display_name,
        'city', business.city,
        'publicationStatus', business.publication_status,
        'verificationStatus', business.verification_status
      ) order by business.updated_at desc)
      from (
        select * from public.businesses
        where archived_at is null
        order by updated_at desc
        limit 40
      ) business
    ), '[]'::jsonb),
    'offers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', offer.id,
        'title', offer.title,
        'businessName', business.display_name,
        'status', offer.status
      ) order by offer.updated_at desc)
      from (
        select * from public.offers
        order by updated_at desc
        limit 40
      ) offer
      join public.businesses business on business.id = offer.business_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_hide_status(p_status_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  update public.statuses
  set archived_at = coalesce(archived_at, now())
  where id = p_status_id;
  if not found then
    raise exception 'No encontramos el estado.';
  end if;
  insert into public.activity_log (actor_id, entity, entity_id, action, payload)
  values (auth.uid(), 'statuses', p_status_id, 'hide', '{}'::jsonb);
  return jsonb_build_object('id', p_status_id, 'archived', true);
end;
$$;

create or replace function public.admin_set_business_publication(p_business_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  if p_status not in ('published', 'paused', 'archived', 'draft') then
    raise exception 'Estado de publicación no válido.';
  end if;
  update public.businesses
  set publication_status = p_status,
      updated_at = now()
  where id = p_business_id;
  if not found then
    raise exception 'No encontramos el negocio.';
  end if;
  insert into public.activity_log (actor_id, entity, entity_id, action, payload)
  values (auth.uid(), 'businesses', p_business_id, 'publication', jsonb_build_object('status', p_status));
  return jsonb_build_object('id', p_business_id, 'publicationStatus', p_status);
end;
$$;

create or replace function public.admin_set_offer_visibility(p_offer_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  if p_status not in ('published', 'paused', 'archived') then
    raise exception 'Estado de oferta no válido.';
  end if;
  update public.offers
  set status = p_status,
      is_available = p_status = 'published',
      updated_at = now()
  where id = p_offer_id;
  if not found then
    raise exception 'No encontramos la oferta.';
  end if;
  insert into public.activity_log (actor_id, entity, entity_id, action, payload)
  values (auth.uid(), 'offers', p_offer_id, 'visibility', jsonb_build_object('status', p_status));
  return jsonb_build_object('id', p_offer_id, 'status', p_status);
end;
$$;

create or replace function public.admin_list_staff()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', id,
      'name', trim(first_name || ' ' || last_name),
      'email', email,
      'role', role,
      'permissions', admin_permissions
    ) order by first_name)
    from public.profiles
    where role in ('ADMIN', 'SUPERADMIN', 'SUPER_ADMIN')
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_set_staff(
  p_user_id uuid,
  p_role text,
  p_permissions jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_superadmin();
  if p_role not in ('USER', 'ADMIN', 'SUPERADMIN', 'SUPER_ADMIN') then
    raise exception 'Rol no válido.';
  end if;
  if p_user_id = auth.uid() and p_role = 'USER' then
    raise exception 'No puedes quitarte el acceso de administrador.';
  end if;
  update public.profiles
  set role = p_role,
      admin_permissions = coalesce(p_permissions, '[]'::jsonb),
      updated_at = now()
  where id = p_user_id;
  if not found then
    raise exception 'No encontramos a la persona.';
  end if;
  insert into public.activity_log (actor_id, entity, entity_id, action, payload)
  values (
    auth.uid(),
    'profiles',
    p_user_id,
    'staff',
    jsonb_build_object('role', p_role, 'permissions', coalesce(p_permissions, '[]'::jsonb))
  );
  return jsonb_build_object('id', p_user_id, 'role', p_role);
end;
$$;

create or replace function public.admin_list_audit(p_limit integer default 80)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', entry.id,
      'actor', trim(coalesce(profile.first_name, '') || ' ' || coalesce(profile.last_name, '')),
      'entity', entry.entity,
      'entityId', entry.entity_id,
      'action', entry.action,
      'payload', entry.payload,
      'createdAt', entry.created_at
    ) order by entry.created_at desc)
    from (
      select *
      from public.activity_log
      order by created_at desc
      limit least(coalesce(p_limit, 80), 200)
    ) entry
    left join public.profiles profile on profile.id = entry.actor_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.enforce_promoted_offer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
  entitlements jsonb;
  allowed text;
begin
  if public.is_admin() then
    return new;
  end if;
  if coalesce(new.is_promoted, false) is not true then
    return new;
  end if;
  if tg_op = 'UPDATE' and coalesce(old.is_promoted, false) is true then
    return new;
  end if;
  select b.owner_id into owner from public.businesses b where b.id = new.business_id;
  if owner is null then
    return new;
  end if;
  entitlements := public.resolve_user_entitlements(owner);
  allowed := entitlements->>'promotedSpaces';
  if allowed is null or allowed in ('false', 'no') then
    raise exception 'Límite: espacios promocionados. Necesitas el plan %.', public.quota_upgrade_plan(owner, 'promotedSpaces');
  end if;
  return new;
end;
$$;

revoke all on function public.admin_setting_number(text, numeric) from public, anon;
revoke all on function public.admin_cost_report() from public, anon;
revoke all on function public.admin_mark_refund(uuid, text) from public, anon;
revoke all on function public.admin_list_promoted_offers() from public, anon;
revoke all on function public.admin_set_offer_promotion(uuid, text) from public, anon;
revoke all on function public.admin_list_categories() from public, anon;
revoke all on function public.admin_save_category(uuid, text, text, integer, boolean) from public, anon;
revoke all on function public.admin_moderation_queue() from public, anon;
revoke all on function public.admin_hide_status(uuid) from public, anon;
revoke all on function public.admin_set_business_publication(uuid, text) from public, anon;
revoke all on function public.admin_set_offer_visibility(uuid, text) from public, anon;
revoke all on function public.admin_list_staff() from public, anon;
revoke all on function public.admin_set_staff(uuid, text, jsonb) from public, anon;
revoke all on function public.admin_list_audit(integer) from public, anon;

grant execute on function public.admin_cost_report() to authenticated;
grant execute on function public.admin_mark_refund(uuid, text) to authenticated;
grant execute on function public.admin_list_promoted_offers() to authenticated;
grant execute on function public.admin_set_offer_promotion(uuid, text) to authenticated;
grant execute on function public.admin_list_categories() to authenticated;
grant execute on function public.admin_save_category(uuid, text, text, integer, boolean) to authenticated;
grant execute on function public.admin_moderation_queue() to authenticated;
grant execute on function public.admin_hide_status(uuid) to authenticated;
grant execute on function public.admin_set_business_publication(uuid, text) to authenticated;
grant execute on function public.admin_set_offer_visibility(uuid, text) to authenticated;
grant execute on function public.admin_list_staff() to authenticated;
grant execute on function public.admin_set_staff(uuid, text, jsonb) to authenticated;
grant execute on function public.admin_list_audit(integer) to authenticated;

create or replace function public.admin_activity_feed(p_limit integer default 20)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  return coalesce((select jsonb_agg(row_to_json(x)) from (
    select
      id::text as id,
      case action
        when 'registro' then 'registro'
        when 'suscripcion' then 'suscripcion'
        when 'cancelacion' then 'cancelacion'
        when 'alerta' then 'alerta'
        when 'cost_alert' then 'alerta'
        when 'refund' then 'alerta'
        else 'actualizacion'
      end as tipo,
      case
        when coalesce(payload ->> 'descripcion', '') <> '' then payload ->> 'descripcion'
        when entity = 'profiles' and payload ? 'role'
          then 'Rol actualizado a ' || (payload ->> 'role')
        when entity = 'profiles' then 'Estado de la cuenta actualizado'
        when entity = 'plans' then 'Plan actualizado'
        when entity = 'payments' and action = 'refund' then 'Pago marcado como reembolsado'
        when entity = 'payments' then 'Estado del pago actualizado'
        when entity = 'app_settings' then 'Ajuste guardado: ' || coalesce(payload ->> 'key', '')
        when action = 'cost_alert' then 'El costo del plan ' || coalesce(payload ->> 'planId', '') || ' superó el umbral'
        when action = 'staff' then 'Permisos de administrador actualizados'
        else initcap(replace(action, '_', ' '))
      end as descripcion,
      created_at as fecha,
      (
        select trim(first_name || ' ' || last_name)
        from public.profiles
        where id = actor_id
      ) as "usuarioNombre"
    from public.activity_log
    order by created_at desc
    limit least(coalesce(p_limit, 20), 100)
  ) x), '[]'::jsonb);
end;
$$;
