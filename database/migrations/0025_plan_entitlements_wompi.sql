-- Cupos de plan, historial de suscripciones y pagos Wompi.
-- No modifica monthly_price ni yearly_price.

alter table public.plans
  add column if not exists entitlements jsonb not null default '{}'::jsonb,
  add column if not exists purchasable boolean not null default false;

alter table public.subscriptions
  add column if not exists source text not null default 'system',
  add column if not exists overrides jsonb not null default '{}'::jsonb,
  add column if not exists reason text,
  add column if not exists granted_by uuid references public.profiles (id) on delete set null;

alter table public.payments
  add column if not exists currency text not null default 'COP',
  add column if not exists provider text,
  add column if not exists provider_reference text,
  add column if not exists provider_transaction_id text,
  add column if not exists billing_period text,
  add column if not exists raw_status text;

alter table public.offers
  add column if not exists is_promoted boolean not null default false;

create unique index if not exists payments_provider_reference_uidx
  on public.payments (provider_reference)
  where provider_reference is not null;

create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  payment_id uuid references public.payments (id) on delete set null,
  actor_id uuid references public.profiles (id) on delete set null,
  plan_id text,
  action text not null,
  source text not null,
  billing_period text,
  starts_at timestamptz,
  ends_at timestamptz,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists subscription_events_user_idx
  on public.subscription_events (user_id, created_at desc);

create table if not exists public.usage_meters (
  user_id uuid not null references public.profiles (id) on delete cascade,
  metric text not null,
  period_start date not null,
  used numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, metric, period_start)
);

update public.plans
set
  purchasable = false,
  storage_gb = 1,
  offer_limit = 5,
  entitlements = jsonb_build_object(
    'groups', 30,
    'groupMembers', 50,
    'callMinutes', 60,
    'mailAccounts', 1,
    'calendars', 1,
    'filesGb', 1,
    'mailStorageGb', 2,
    'catalogOffers', 5,
    'aiCredits', 50,
    'aiLevel', 'basic',
    'transcription', false,
    'documentProcessing', false,
    'automations', 'none',
    'storageAddon', false,
    'extraAiCredits', false,
    'promotedSpaces', false
  ),
  highlights = array[
    'Chats, agenda y notas sin límite',
    'Hasta 30 grupos y 50 integrantes',
    '60 minutos de llamadas al mes',
    '1 correo y 1 calendario',
    '1 GB de archivos y 2 GB de correo',
    'Catálogo de 5 productos',
    'Asistente de IA con cuota básica'
  ]
where id = 'free';

update public.plans
set
  purchasable = true,
  storage_gb = 10,
  offer_limit = 5,
  entitlements = jsonb_build_object(
    'groups', 100,
    'groupMembers', 500,
    'callMinutes', 300,
    'mailAccounts', 3,
    'calendars', 3,
    'filesGb', 10,
    'mailStorageGb', 10,
    'catalogOffers', 5,
    'aiCredits', 300,
    'aiLevel', 'expanded',
    'transcription', true,
    'documentProcessing', true,
    'automations', 'basic',
    'storageAddon', true,
    'extraAiCredits', true,
    'promotedSpaces', false
  ),
  highlights = array[
    'Chats, agenda y notas sin límite',
    'Hasta 100 grupos y 500 integrantes',
    '300 minutos de llamadas al mes',
    '3 correos y 3 calendarios',
    '10 GB de archivos y 10 GB de correo',
    'Asistente ampliado, transcripción y resúmenes',
    'Documentos y automatizaciones básicas'
  ]
where id = 'plus';

update public.plans
set
  purchasable = true,
  storage_gb = 20,
  offer_limit = 0,
  entitlements = jsonb_build_object(
    'groups', 100,
    'groupMembers', 500,
    'callMinutes', 1000,
    'mailAccounts', 5,
    'calendars', 5,
    'filesGb', 20,
    'mailStorageGb', 20,
    'catalogOffers', null,
    'aiCredits', 1500,
    'aiLevel', 'commercial',
    'transcription', true,
    'documentProcessing', true,
    'automations', 'advanced',
    'storageAddon', true,
    'extraAiCredits', 'discount',
    'promotedSpaces', 'identified'
  ),
  highlights = array[
    'Chats, agenda y notas sin límite',
    'Hasta 100 grupos y 500 integrantes',
    '1000 minutos de llamadas al mes',
    '5 correos y 5 calendarios',
    '20 GB de archivos y 20 GB de correo',
    'Catálogo sin límite y espacios promocionados',
    'IA comercial y automatizaciones avanzadas'
  ]
where id = 'pro';

update public.plans
set
  purchasable = false,
  storage_gb = 0,
  offer_limit = 0,
  entitlements = jsonb_build_object(
    'groups', null,
    'groupMembers', null,
    'callMinutes', null,
    'mailAccounts', null,
    'calendars', null,
    'filesGb', null,
    'mailStorageGb', null,
    'catalogOffers', null,
    'aiCredits', null,
    'aiLevel', 'custom',
    'transcription', true,
    'documentProcessing', true,
    'automations', 'custom',
    'storageAddon', 'included',
    'extraAiCredits', 'included',
    'promotedSpaces', true
  ),
  highlights = array[
    'Cupos a medida, asignados por el equipo Buddy',
    'Chats, agenda, notas y catálogo sin límite',
    'Asistente, transcripción y documentos',
    'Automatizaciones personalizadas',
    'Espacios promocionados'
  ]
where id = 'enterprise';

create or replace function public.is_plan_admin()
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
      and role in ('ADMIN', 'SUPERADMIN', 'SUPER_ADMIN')
  );
$$;

create or replace function public.assert_plan_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_plan_admin() then
    raise exception 'Solo un administrador puede cambiar planes y suscripciones.';
  end if;
end;
$$;

create or replace function public.billing_month_start()
returns date
language sql
stable
as $$
  select (date_trunc('month', now() at time zone 'America/Bogota'))::date;
$$;

create or replace function public.entitlement_number(p_entitlements jsonb, p_key text)
returns numeric
language sql
immutable
as $$
  select case
    when p_entitlements is null
      or not (p_entitlements ? p_key)
      or jsonb_typeof(p_entitlements -> p_key) = 'null'
      then null
    when jsonb_typeof(p_entitlements -> p_key) = 'number'
      then (p_entitlements ->> p_key)::numeric
    else null
  end;
$$;

create or replace function public.mail_message_bytes(p_body text, p_attachments jsonb)
returns bigint
language sql
immutable
as $$
  select octet_length(coalesce(p_body, ''))::bigint
    + coalesce((
      select sum(
        coalesce(
          case when coalesce(item->>'size', '') ~ '^[0-9]+$' then (item->>'size')::bigint else null end,
          case when coalesce(item->>'size_bytes', '') ~ '^[0-9]+$' then (item->>'size_bytes')::bigint else null end,
          octet_length(item::text)::bigint
        )
      )
      from jsonb_array_elements(coalesce(p_attachments, '[]'::jsonb)) as item
    ), 0);
$$;

create or replace function public.integration_counts_as_mail(p_capabilities text[], p_scopes text[])
returns boolean
language sql
immutable
as $$
  select coalesce(p_capabilities, '{}'::text[]) && array['mail', 'email', 'gmail', 'outlook']::text[]
    or exists (
      select 1
      from unnest(coalesce(p_scopes, '{}'::text[])) as scope
      where scope ilike '%mail%' or scope ilike '%gmail%'
    )
    or coalesce(cardinality(p_capabilities), 0) = 0;
$$;

create or replace function public.integration_counts_as_calendar(p_capabilities text[], p_scopes text[])
returns boolean
language sql
immutable
as $$
  select coalesce(p_capabilities, '{}'::text[]) && array['calendar', 'calendars']::text[]
    or exists (
      select 1
      from unnest(coalesce(p_scopes, '{}'::text[])) as scope
      where scope ilike '%calendar%'
    )
    or coalesce(cardinality(p_capabilities), 0) = 0;
$$;

create or replace function public.expire_lapsed_subscription(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.subscriptions;
begin
  if p_user_id is null then
    return;
  end if;

  select *
  into current_row
  from public.subscriptions
  where user_id = p_user_id
    and status = 'active'
  order by created_at desc
  limit 1
  for update;

  if not found then
    insert into public.subscriptions (user_id, plan_id, status, billing_period, source, started_at)
    values (p_user_id, 'free', 'active', 'monthly', 'system', now());
    return;
  end if;

  if current_row.plan_id = 'free'
    or current_row.current_period_end is null
    or current_row.current_period_end > now() then
    return;
  end if;

  update public.subscriptions
  set status = 'expired', updated_at = now()
  where id = current_row.id;

  insert into public.subscription_events (
    user_id, subscription_id, plan_id, action, source, billing_period, starts_at, ends_at, reason
  ) values (
    p_user_id,
    current_row.id,
    current_row.plan_id,
    'expired',
    'sistema',
    current_row.billing_period,
    current_row.started_at,
    current_row.current_period_end,
    'El periodo terminó sin un pago nuevo.'
  );

  insert into public.subscriptions (user_id, plan_id, status, billing_period, source, started_at)
  values (p_user_id, 'free', 'active', 'monthly', 'system', now());
end;
$$;

create or replace function public.resolve_user_entitlements(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.subscriptions;
  plan_row public.plans;
begin
  perform public.expire_lapsed_subscription(p_user_id);

  select *
  into current_row
  from public.subscriptions
  where user_id = p_user_id
    and status = 'active'
  order by created_at desc
  limit 1;

  if not found then
    select * into plan_row from public.plans where id = 'free';
    return coalesce(plan_row.entitlements, '{}'::jsonb);
  end if;

  select * into plan_row from public.plans where id = current_row.plan_id;
  return coalesce(plan_row.entitlements, '{}'::jsonb) || coalesce(current_row.overrides, '{}'::jsonb);
end;
$$;

create or replace function public.entitlement_limit(p_user_id uuid, p_key text)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return public.entitlement_number(public.resolve_user_entitlements(p_user_id), p_key);
end;
$$;

create or replace function public.meter_used(p_user_id uuid, p_metric text)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select used
    from public.usage_meters
    where user_id = p_user_id
      and metric = p_metric
      and period_start = public.billing_month_start()
  ), 0);
$$;

create or replace function public.add_usage(p_user_id uuid, p_metric text, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_amount is null or p_amount = 0 then
    return;
  end if;
  insert into public.usage_meters (user_id, metric, period_start, used)
  values (p_user_id, p_metric, public.billing_month_start(), p_amount)
  on conflict (user_id, metric, period_start)
  do update set used = public.usage_meters.used + excluded.used, updated_at = now();
end;
$$;

create or replace function public.quota_upgrade_plan(p_user_id uuid, p_metric text)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  current_entitlements jsonb;
  candidate record;
  current_number numeric;
  candidate_number numeric;
  current_flag text;
  candidate_flag text;
begin
  current_entitlements := public.resolve_user_entitlements(p_user_id);
  current_number := public.entitlement_number(current_entitlements, p_metric);
  current_flag := current_entitlements ->> p_metric;

  for candidate in
    select name, entitlements
    from public.plans
    where is_active
    order by case id
      when 'free' then 1
      when 'plus' then 2
      when 'pro' then 3
      when 'enterprise' then 4
      else 9
    end
  loop
    candidate_number := public.entitlement_number(candidate.entitlements, p_metric);
    candidate_flag := candidate.entitlements ->> p_metric;

    if p_metric in (
      'groups', 'groupMembers', 'callMinutes', 'mailAccounts', 'calendars',
      'filesGb', 'mailStorageGb', 'catalogOffers', 'aiCredits'
    ) then
      if current_number is not null and (candidate_number is null or candidate_number > current_number) then
        return candidate.name;
      end if;
    elsif p_metric = 'automations' then
      if coalesce(current_flag, 'none') in ('none', '')
        and coalesce(candidate_flag, 'none') not in ('none', '') then
        return candidate.name;
      end if;
      if current_flag = 'basic' and candidate_flag in ('advanced', 'custom') then
        return candidate.name;
      end if;
    elsif coalesce(current_flag, 'false') in ('false', 'no', '')
      and coalesce(candidate_flag, 'false') not in ('false', 'no', '') then
      return candidate.name;
    end if;
  end loop;

  return 'Enterprise';
end;
$$;

create or replace function public.consume_ai_credits(
  p_feature text,
  p_amount integer default 1,
  p_tool text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  entitlements jsonb;
  level text;
  cap numeric;
  used numeric;
  cost integer := greatest(coalesce(p_amount, 0), 0);
begin
  if uid is null then
    raise exception 'No autorizado.';
  end if;

  entitlements := public.resolve_user_entitlements(uid);
  level := coalesce(entitlements->>'automations', 'none');

  if p_feature = 'transcription' and coalesce((entitlements->>'transcription')::boolean, false) is not true then
    raise exception 'Límite: transcripción y resúmenes. Necesitas el plan %.', public.quota_upgrade_plan(uid, 'transcription');
  end if;

  if p_feature = 'documents' and coalesce((entitlements->>'documentProcessing')::boolean, false) is not true then
    raise exception 'Límite: procesamiento de documentos. Necesitas el plan %.', public.quota_upgrade_plan(uid, 'documentProcessing');
  end if;

  if p_feature = 'automation' then
    if level in ('none', '') then
      raise exception 'Límite: automatizaciones de IA. Necesitas el plan %.', public.quota_upgrade_plan(uid, 'automations');
    end if;
    if level = 'basic' and p_tool not in (
      'send_email', 'send_chat_message', 'create_note', 'append_note',
      'create_event', 'update_event', 'cancel_event'
    ) then
      raise exception 'Límite: automatizaciones avanzadas. Necesitas el plan %.', public.quota_upgrade_plan(uid, 'automations');
    end if;
  end if;

  cap := public.entitlement_number(entitlements, 'aiCredits');
  used := public.meter_used(uid, 'aiCredits');
  if cap is not null and used + cost > cap then
    raise exception 'Límite: créditos de IA (% de %). Necesitas el plan %.', used::int, cap::int, public.quota_upgrade_plan(uid, 'aiCredits');
  end if;

  if cost > 0 then
    perform public.add_usage(uid, 'aiCredits', cost);
  end if;

  return jsonb_build_object('ok', true, 'used', used + cost, 'limit', cap);
end;
$$;

create or replace function public.enforce_conversation_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cap numeric;
  used bigint;
begin
  if new.kind is distinct from 'group' or new.owner_id is null then
    return new;
  end if;
  cap := public.entitlement_limit(new.owner_id, 'groups');
  if cap is null then
    return new;
  end if;
  select count(*) into used
  from public.conversations
  where owner_id = new.owner_id
    and kind = 'group'
    and id is distinct from new.id;
  if used >= cap then
    raise exception 'Límite: grupos (%). Necesitas el plan %.', cap::int, public.quota_upgrade_plan(new.owner_id, 'groups');
  end if;
  return new;
end;
$$;

create or replace function public.enforce_member_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
  kind text;
  cap numeric;
  used bigint;
begin
  select c.owner_id, c.kind into owner, kind
  from public.conversations c
  where c.id = new.conversation_id;

  if kind is distinct from 'group' or owner is null then
    return new;
  end if;

  cap := public.entitlement_limit(owner, 'groupMembers');
  if cap is null then
    return new;
  end if;

  select count(*) into used
  from public.conversation_members
  where conversation_id = new.conversation_id
    and status = 'active'
    and id is distinct from new.id;

  if used >= cap then
    raise exception 'Límite: integrantes del grupo (%). Necesitas el plan %.', cap::int, public.quota_upgrade_plan(owner, 'groupMembers');
  end if;
  return new;
end;
$$;

create or replace function public.enforce_call_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cap numeric;
  used numeric;
begin
  if new.started_by is null then
    return new;
  end if;
  cap := public.entitlement_limit(new.started_by, 'callMinutes');
  if cap is null then
    return new;
  end if;
  used := public.meter_used(new.started_by, 'callMinutes');
  if used >= cap then
    raise exception 'Límite: minutos de llamadas (%). Necesitas el plan %.', cap::int, public.quota_upgrade_plan(new.started_by, 'callMinutes');
  end if;
  return new;
end;
$$;

create or replace function public.record_call_minutes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  minutes numeric;
begin
  if new.started_by is null or new.ended_at is null or old.ended_at is not null then
    return new;
  end if;
  if new.status in ('declined', 'missed', 'cancelled', 'ringing') then
    return new;
  end if;
  minutes := ceil(extract(epoch from (new.ended_at - coalesce(new.started_at, new.ended_at))) / 60.0);
  if minutes < 1 then
    minutes := 1;
  end if;
  perform public.add_usage(new.started_by, 'callMinutes', minutes);
  return new;
end;
$$;

create or replace function public.enforce_integration_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mail_cap numeric;
  calendar_cap numeric;
  mail_used bigint;
  calendar_used bigint;
  counts_mail boolean;
  counts_calendar boolean;
begin
  if new.user_id is null or new.status not in ('active', 'connected') then
    return new;
  end if;

  counts_mail := public.integration_counts_as_mail(new.capabilities, new.granted_scopes);
  counts_calendar := public.integration_counts_as_calendar(new.capabilities, new.granted_scopes);

  if counts_mail then
    mail_cap := public.entitlement_limit(new.user_id, 'mailAccounts');
    if mail_cap is not null then
      select count(*) into mail_used
      from public.integrations
      where user_id = new.user_id
        and status in ('active', 'connected')
        and id is distinct from new.id
        and public.integration_counts_as_mail(capabilities, granted_scopes);
      if mail_used + 1 > mail_cap then
        raise exception 'Límite: cuentas de correo (%). Necesitas el plan %.', mail_cap::int, public.quota_upgrade_plan(new.user_id, 'mailAccounts');
      end if;
    end if;
  end if;

  if counts_calendar then
    calendar_cap := public.entitlement_limit(new.user_id, 'calendars');
    if calendar_cap is not null then
      select count(*) into calendar_used
      from public.integrations
      where user_id = new.user_id
        and status in ('active', 'connected')
        and id is distinct from new.id
        and public.integration_counts_as_calendar(capabilities, granted_scopes);
      if calendar_used + 1 > calendar_cap then
        raise exception 'Límite: calendarios (%). Necesitas el plan %.', calendar_cap::int, public.quota_upgrade_plan(new.user_id, 'calendars');
      end if;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_file_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cap numeric;
  used bigint;
begin
  if new.owner_id is null or coalesce(new.kind, 'file') <> 'file' or new.trashed_at is not null then
    return new;
  end if;
  cap := public.entitlement_limit(new.owner_id, 'filesGb');
  if cap is null then
    return new;
  end if;
  select coalesce(sum(size_bytes), 0) into used
  from public.files
  where owner_id = new.owner_id
    and kind = 'file'
    and trashed_at is null
    and id is distinct from new.id;
  if used + coalesce(new.size_bytes, 0) > cap * 1073741824 then
    raise exception 'Límite: almacenamiento de archivos (% GB). Necesitas el plan %.', cap::int, public.quota_upgrade_plan(new.owner_id, 'filesGb');
  end if;
  return new;
end;
$$;

create or replace function public.enforce_mail_storage_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cap numeric;
  used bigint;
begin
  if new.user_id is null then
    return new;
  end if;
  cap := public.entitlement_limit(new.user_id, 'mailStorageGb');
  if cap is null then
    return new;
  end if;
  select coalesce(sum(public.mail_message_bytes(body, attachments)), 0) into used
  from public.mail_messages
  where user_id = new.user_id
    and id is distinct from new.id;
  if used + public.mail_message_bytes(new.body, new.attachments) > cap * 1073741824 then
    raise exception 'Límite: almacenamiento de correo (% GB). Necesitas el plan %.', cap::int, public.quota_upgrade_plan(new.user_id, 'mailStorageGb');
  end if;
  return new;
end;
$$;

create or replace function public.enforce_catalog_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
  cap numeric;
  used bigint;
begin
  if new.archived_at is not null then
    return new;
  end if;
  select b.owner_id into owner from public.businesses b where b.id = new.business_id;
  if owner is null then
    return new;
  end if;
  cap := public.entitlement_limit(owner, 'catalogOffers');
  if cap is null then
    return new;
  end if;
  select count(*) into used
  from public.offers o
  join public.businesses b on b.id = o.business_id
  where b.owner_id = owner
    and o.archived_at is null
    and o.id is distinct from new.id;
  if used >= cap then
    raise exception 'Límite: productos del catálogo (%). Necesitas el plan %.', cap::int, public.quota_upgrade_plan(owner, 'catalogOffers');
  end if;
  return new;
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

drop trigger if exists enforce_conversation_quota on public.conversations;
create trigger enforce_conversation_quota
before insert on public.conversations
for each row execute function public.enforce_conversation_quota();

drop trigger if exists enforce_member_quota on public.conversation_members;
create trigger enforce_member_quota
before insert on public.conversation_members
for each row execute function public.enforce_member_quota();

drop trigger if exists enforce_call_quota on public.calls;
create trigger enforce_call_quota
before insert on public.calls
for each row execute function public.enforce_call_quota();

drop trigger if exists record_call_minutes on public.calls;
create trigger record_call_minutes
after update on public.calls
for each row execute function public.record_call_minutes();

drop trigger if exists enforce_integration_quota on public.integrations;
create trigger enforce_integration_quota
before insert or update of status, capabilities, granted_scopes on public.integrations
for each row execute function public.enforce_integration_quota();

drop trigger if exists enforce_file_quota on public.files;
create trigger enforce_file_quota
before insert or update of size_bytes, trashed_at on public.files
for each row execute function public.enforce_file_quota();

drop trigger if exists enforce_mail_storage_quota on public.mail_messages;
create trigger enforce_mail_storage_quota
before insert or update of body, attachments on public.mail_messages
for each row execute function public.enforce_mail_storage_quota();

drop trigger if exists enforce_catalog_quota on public.offers;
create trigger enforce_catalog_quota
before insert or update of archived_at on public.offers
for each row execute function public.enforce_catalog_quota();

drop trigger if exists enforce_promoted_offer on public.offers;
create trigger enforce_promoted_offer
before insert or update of is_promoted on public.offers
for each row execute function public.enforce_promoted_offer();

create or replace function public.create_checkout_intent(
  p_plan_id text,
  p_billing_period text default 'monthly'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  plan_row public.plans;
  period text := case when p_billing_period = 'yearly' then 'yearly' else 'monthly' end;
  amount numeric;
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

  amount := case when period = 'yearly' then plan_row.yearly_price else plan_row.monthly_price end;
  if amount is null or amount <= 0 then
    raise exception 'Este plan todavía no tiene un precio en pesos.';
  end if;

  reference := 'buddy' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 20);
  insert into public.payments (
    user_id, plan_id, transaction_type, status, amount, payment_method,
    currency, provider, provider_reference, billing_period, raw_status
  ) values (
    uid, plan_row.id, 'alta', 'pendiente', amount, 'wompi',
    'COP', 'wompi', reference, period, 'PENDING'
  );

  return jsonb_build_object(
    'reference', reference,
    'amount_in_cents', round(amount * 100)::bigint,
    'currency', 'COP',
    'plan_id', plan_row.id,
    'plan_name', plan_row.name,
    'billing_period', period
  );
end;
$$;

create or replace function public.apply_wompi_payment(
  p_reference text,
  p_transaction_id text,
  p_status text,
  p_amount_in_cents bigint
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
  approved boolean := upper(coalesce(p_status, '')) = 'APPROVED';
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

  if payment_row.status = 'pagado' then
    return jsonb_build_object('ok', true, 'duplicate', true, 'subscription_id', payment_row.subscription_id);
  end if;

  if not approved then
    update public.payments
    set status = 'fallido',
        raw_status = p_status,
        provider_transaction_id = coalesce(p_transaction_id, provider_transaction_id)
    where id = payment_row.id;
    return jsonb_build_object('ok', true, 'approved', false);
  end if;

  if p_amount_in_cents is distinct from round(payment_row.amount * 100)::bigint then
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
        source = 'wompi',
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
      'wompi'
    )
    returning id into new_subscription_id;
  end if;

  update public.payments
  set status = 'pagado',
      raw_status = 'APPROVED',
      provider_transaction_id = p_transaction_id,
      subscription_id = new_subscription_id,
      transaction_type = case when action_name = 'renewed' then 'renovacion' else 'alta' end
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
    'wompi',
    payment_row.billing_period,
    case when action_name = 'renewed' then current_row.current_period_end else now() end,
    period_end,
    'Pago aprobado en Wompi.'
  );

  return jsonb_build_object('ok', true, 'approved', true, 'subscription_id', new_subscription_id, 'ends_at', period_end);
end;
$$;

create or replace function public.admin_set_subscription(
  p_user_id uuid,
  p_plan_id text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_reason text,
  p_overrides jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_row public.plans;
  current_row public.subscriptions;
  new_id uuid;
  starts_at timestamptz := coalesce(p_starts_at, now());
  reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  perform public.assert_plan_admin();
  if reason is null then
    raise exception 'Escribe el motivo de este cambio.';
  end if;

  select * into plan_row from public.plans where id = p_plan_id and is_active;
  if not found then
    raise exception 'Plan no encontrado.';
  end if;

  if plan_row.id <> 'free' and (p_ends_at is null or p_ends_at <= starts_at) then
    raise exception 'Indica una fecha de fin posterior al inicio.';
  end if;

  select * into current_row
  from public.subscriptions
  where user_id = p_user_id and status = 'active'
  order by created_at desc
  limit 1
  for update;

  if current_row.id is not null then
    update public.subscriptions
    set status = 'revoked', updated_at = now(), cancelled_at = now()
    where id = current_row.id;
  end if;

  insert into public.subscriptions (
    user_id, plan_id, status, billing_period, started_at, current_period_end,
    source, overrides, reason, granted_by
  ) values (
    p_user_id,
    plan_row.id,
    'active',
    'monthly',
    starts_at,
    case when plan_row.id = 'free' then null else p_ends_at end,
    'admin',
    coalesce(p_overrides, '{}'::jsonb),
    reason,
    auth.uid()
  )
  returning id into new_id;

  insert into public.subscription_events (
    user_id, subscription_id, actor_id, plan_id, action, source,
    starts_at, ends_at, reason
  ) values (
    p_user_id,
    new_id,
    auth.uid(),
    plan_row.id,
    case when plan_row.id = 'free' then 'revoked' else 'manual_grant' end,
    'admin',
    starts_at,
    case when plan_row.id = 'free' then null else p_ends_at end,
    reason
  );

  return public.get_my_subscription_for(p_user_id);
end;
$$;

create or replace function public.admin_list_subscription_events(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_plan_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', event.id,
      'action', event.action,
      'source', event.source,
      'planId', event.plan_id,
      'startsAt', event.starts_at,
      'endsAt', event.ends_at,
      'reason', event.reason,
      'createdAt', event.created_at,
      'actorId', event.actor_id,
      'paymentId', event.payment_id
    ) order by event.created_at desc)
    from public.subscription_events event
    where event.user_id = p_user_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.get_my_subscription_for(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.subscriptions;
  plan_row public.plans;
  entitlements jsonb;
  file_bytes bigint;
  mail_bytes bigint;
  groups_used bigint;
  mail_used bigint;
  calendar_used bigint;
  catalog_used bigint;
begin
  if p_user_id is not null
    and auth.role() is distinct from 'service_role'
    and auth.uid() is distinct from p_user_id
    and not public.is_plan_admin() then
    raise exception 'No autorizado.';
  end if;

  if p_user_id is null then
    select * into plan_row from public.plans where id = 'free';
    return jsonb_build_object('subscription', null, 'plan', to_jsonb(plan_row), 'entitlements', coalesce(plan_row.entitlements, '{}'::jsonb), 'usage', '{}'::jsonb);
  end if;

  perform public.expire_lapsed_subscription(p_user_id);
  entitlements := public.resolve_user_entitlements(p_user_id);

  select * into current_row
  from public.subscriptions
  where user_id = p_user_id and status = 'active'
  order by created_at desc
  limit 1;

  select * into plan_row from public.plans where id = coalesce(current_row.plan_id, 'free');

  select count(*) into groups_used
  from public.conversations
  where owner_id = p_user_id and kind = 'group';

  select count(*) into mail_used
  from public.integrations
  where user_id = p_user_id
    and status in ('active', 'connected')
    and public.integration_counts_as_mail(capabilities, granted_scopes);

  select count(*) into calendar_used
  from public.integrations
  where user_id = p_user_id
    and status in ('active', 'connected')
    and public.integration_counts_as_calendar(capabilities, granted_scopes);

  select coalesce(sum(size_bytes), 0) into file_bytes
  from public.files
  where owner_id = p_user_id and kind = 'file' and trashed_at is null;

  select coalesce(sum(public.mail_message_bytes(body, attachments)), 0) into mail_bytes
  from public.mail_messages
  where user_id = p_user_id;

  select count(*) into catalog_used
  from public.offers o
  join public.businesses b on b.id = o.business_id
  where b.owner_id = p_user_id and o.archived_at is null;

  return jsonb_build_object(
    'subscription', to_jsonb(current_row),
    'plan', to_jsonb(plan_row),
    'entitlements', entitlements,
    'usage', jsonb_build_object(
      'groups', groups_used,
      'mailAccounts', mail_used,
      'calendars', calendar_used,
      'filesBytes', file_bytes,
      'mailBytes', mail_bytes,
      'catalogOffers', catalog_used,
      'callMinutes', public.meter_used(p_user_id, 'callMinutes'),
      'aiCredits', public.meter_used(p_user_id, 'aiCredits')
    )
  );
end;
$$;

create or replace function public.get_my_subscription()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.get_my_subscription_for(auth.uid());
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
    raise exception 'El pago de este plan se confirma con Wompi.';
  end if;
  raise exception 'Este plan solo lo asigna un administrador.';
end;
$$;

create or replace function public.cancel_subscription()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.subscriptions;
begin
  if auth.uid() is null then
    raise exception 'No autorizado.';
  end if;

  perform public.expire_lapsed_subscription(auth.uid());

  select * into current_row
  from public.subscriptions
  where user_id = auth.uid()
    and status = 'active'
    and plan_id <> 'free'
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'No tienes un plan de pago vigente.';
  end if;

  update public.subscriptions
  set cancelled_at = now(), updated_at = now()
  where id = current_row.id;

  insert into public.subscription_events (
    user_id, subscription_id, actor_id, plan_id, action, source,
    billing_period, starts_at, ends_at, reason
  ) values (
    auth.uid(), current_row.id, auth.uid(), current_row.plan_id, 'cancel_scheduled', 'user',
    current_row.billing_period, current_row.started_at, current_row.current_period_end,
    'El acceso sigue hasta el final del periodo. No hay renovación automática.'
  );

  return public.get_my_subscription();
end;
$$;

create or replace function public.reactivate_subscription()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.subscriptions;
begin
  if auth.uid() is null then
    raise exception 'No autorizado.';
  end if;

  select * into current_row
  from public.subscriptions
  where user_id = auth.uid()
    and status = 'active'
    and plan_id <> 'free'
    and current_period_end > now()
    and cancelled_at is not null
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'No hay un periodo vigente para reactivar. Debes pagar de nuevo.';
  end if;

  update public.subscriptions
  set cancelled_at = null, updated_at = now()
  where id = current_row.id;

  insert into public.subscription_events (
    user_id, subscription_id, actor_id, plan_id, action, source, starts_at, ends_at, reason
  ) values (
    auth.uid(), current_row.id, auth.uid(), current_row.plan_id, 'reactivated', 'user',
    current_row.started_at, current_row.current_period_end,
    'Se quitó la marca de cancelación. El acceso sigue hasta la fecha de fin.'
  );

  return public.get_my_subscription();
end;
$$;

drop function if exists public.admin_update_plan(text, text, text, numeric, numeric, integer, integer, integer, jsonb, text[]);

create or replace function public.admin_update_plan(
  p_plan_id text,
  p_name text,
  p_description text,
  p_monthly_price numeric,
  p_yearly_price numeric,
  p_storage_gb integer,
  p_device_limit integer,
  p_offer_limit integer,
  p_features jsonb,
  p_highlights text[],
  p_entitlements jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_plan_admin();
  if p_monthly_price < 0 or p_yearly_price < 0 then
    raise exception 'El precio no puede ser negativo.';
  end if;

  update public.plans
  set name = p_name,
      description = p_description,
      monthly_price = p_monthly_price,
      yearly_price = p_yearly_price,
      storage_gb = p_storage_gb,
      device_limit = p_device_limit,
      offer_limit = p_offer_limit,
      features = coalesce(p_features, features),
      highlights = coalesce(p_highlights, highlights),
      entitlements = coalesce(p_entitlements, entitlements),
      updated_at = now()
  where id = p_plan_id;

  return (
    select value
    from jsonb_array_elements(public.admin_list_plans()) as value
    where value->>'id' = p_plan_id
    limit 1
  );
end;
$$;

create or replace function public.admin_list_plans()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', pl.id,
      'nombre', pl.name,
      'precioMensual', pl.monthly_price,
      'precioAnual', pl.yearly_price,
      'descripcion', coalesce(pl.description, ''),
      'caracteristicas', to_jsonb(pl.highlights),
      'usuariosActivos', (
        select count(*)
        from public.subscriptions s
        where s.plan_id = pl.id
          and s.status = 'active'
          and (s.current_period_end is null or s.current_period_end > now())
      ),
      'color', coalesce(pl.color, '#6025d2'),
      'purchasable', pl.purchasable,
      'entitlements', pl.entitlements,
      'limites', jsonb_build_object(
        'almacenamientoGB', pl.storage_gb,
        'dispositivos', pl.device_limit,
        'ofertasPerfil', pl.offer_limit
      ),
      'funciones', pl.features
    ) order by pl.sort_order)
    from public.plans pl
  ), '[]'::jsonb);
end;
$$;

alter table public.subscription_events enable row level security;
alter table public.usage_meters enable row level security;

revoke all on table public.subscription_events from anon, authenticated;
revoke all on table public.usage_meters from anon, authenticated;
grant select on table public.subscription_events to authenticated;
grant select on table public.usage_meters to authenticated;

drop policy if exists subscription_events_select on public.subscription_events;
create policy subscription_events_select on public.subscription_events
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists usage_meters_select on public.usage_meters;
create policy usage_meters_select on public.usage_meters
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

revoke all on function public.apply_wompi_payment(text, text, text, bigint) from public, anon, authenticated;
grant execute on function public.apply_wompi_payment(text, text, text, bigint) to service_role;

grant execute on function public.create_checkout_intent(text, text) to authenticated;
grant execute on function public.consume_ai_credits(text, integer, text) to authenticated;
grant execute on function public.admin_set_subscription(uuid, text, timestamptz, timestamptz, text, jsonb) to authenticated;
grant execute on function public.admin_list_subscription_events(uuid) to authenticated;
grant execute on function public.get_my_subscription_for(uuid) to authenticated;

notify pgrst, 'reload schema';
