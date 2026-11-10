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

