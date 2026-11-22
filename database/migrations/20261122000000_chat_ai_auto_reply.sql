-- Auto-respuesta de Buddy AI en chats personales (direct) y de negocios (business),
-- con control estratégico exclusivo de Superadmin (por plan y override por usuario),
-- pausa automática por intervención humana, aislamiento de privacidad y cola idempotente.

-- 1. Extensiones de tablas existentes
alter table public.messages
  add column if not exists ai_generated boolean not null default false,
  add column if not exists ai_reply_to_message_id uuid references public.messages(id) on delete set null;

create index if not exists messages_conversation_ai_created_idx
  on public.messages (conversation_id, created_at desc)
  where ai_generated = true;

create index if not exists messages_ai_reply_to_idx
  on public.messages (ai_reply_to_message_id)
  where ai_reply_to_message_id is not null;

alter table public.assistant_settings
  add column if not exists auto_reply_personal_enabled boolean not null default false,
  add column if not exists auto_reply_business_enabled boolean not null default false,
  add column if not exists auto_reply_personal_prompt text not null default '',
  add column if not exists auto_reply_pause_minutes integer not null default 30;

alter table public.assistant_settings
  drop constraint if exists assistant_settings_auto_reply_prompt_len;
alter table public.assistant_settings
  add constraint assistant_settings_auto_reply_prompt_len
  check (char_length(auto_reply_personal_prompt) <= 1000);

alter table public.assistant_settings
  drop constraint if exists assistant_settings_auto_reply_pause_check;
alter table public.assistant_settings
  add constraint assistant_settings_auto_reply_pause_check
  check (auto_reply_pause_minutes between 5 and 240);

alter table public.conversation_members
  add column if not exists ai_auto_reply_enabled boolean,
  add column if not exists ai_paused_until timestamptz;

-- 2. Configuración privada de IA por negocio (no expuesta por businesses_public_read)
create table if not exists public.business_ai_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  enabled boolean not null default false,
  prompt text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_ai_settings_prompt_len check (char_length(prompt) <= 1500)
);

create index if not exists business_ai_settings_owner_idx
  on public.business_ai_settings (owner_id);

alter table public.business_ai_settings enable row level security;

revoke all on table public.business_ai_settings from public, anon, authenticated;
grant select, insert, update, delete on table public.business_ai_settings to authenticated;

drop policy if exists business_ai_settings_select on public.business_ai_settings;
create policy business_ai_settings_select
  on public.business_ai_settings
  for select to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists business_ai_settings_insert on public.business_ai_settings;
create policy business_ai_settings_insert
  on public.business_ai_settings
  for insert to authenticated
  with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1
      from public.businesses b
      where b.id = business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists business_ai_settings_update on public.business_ai_settings;
create policy business_ai_settings_update
  on public.business_ai_settings
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1
      from public.businesses b
      where b.id = business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists business_ai_settings_delete on public.business_ai_settings;
create policy business_ai_settings_delete
  on public.business_ai_settings
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists business_ai_settings_device on public.business_ai_settings;
create policy business_ai_settings_device
  on public.business_ai_settings
  as restrictive
  for all to authenticated
  using (public.has_active_device())
  with check (public.has_active_device());

-- 3. Cola idempotente de trabajos de auto-respuesta (solo service_role / triggers internos)
create table if not exists public.chat_ai_reply_jobs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  trigger_message_id uuid not null references public.messages(id) on delete cascade,
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  target_business_id uuid references public.businesses(id) on delete cascade,
  scope text not null check (scope in ('personal', 'business')),
  dispatch_ticket uuid not null default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'skipped', 'failed')),
  skip_reason text,
  reply_message_id uuid references public.messages(id) on delete set null,
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trigger_message_id, target_user_id)
);

create index if not exists chat_ai_reply_jobs_pending_idx
  on public.chat_ai_reply_jobs (status, created_at)
  where status in ('pending', 'processing');

create index if not exists chat_ai_reply_jobs_target_idx
  on public.chat_ai_reply_jobs (target_user_id, created_at desc);

create index if not exists chat_ai_reply_jobs_conversation_idx
  on public.chat_ai_reply_jobs (conversation_id);

create index if not exists chat_ai_reply_jobs_business_idx
  on public.chat_ai_reply_jobs (target_business_id)
  where target_business_id is not null;

create index if not exists chat_ai_reply_jobs_reply_msg_idx
  on public.chat_ai_reply_jobs (reply_message_id)
  where reply_message_id is not null;

alter table public.chat_ai_reply_jobs enable row level security;
revoke all on table public.chat_ai_reply_jobs from public, anon, authenticated;

-- 4. Semilla inicial de entitlements por plan (totalmente editables por Superadmin)
update public.plans
set entitlements = coalesce(entitlements, '{}'::jsonb) || jsonb_build_object(
  'chatAutoReplyPersonal', false,
  'chatAutoReplyBusiness', false
)
where id = 'free'
  and not (coalesce(entitlements, '{}'::jsonb) ? 'chatAutoReplyPersonal');

update public.plans
set entitlements = coalesce(entitlements, '{}'::jsonb) || jsonb_build_object(
  'chatAutoReplyPersonal', true,
  'chatAutoReplyBusiness', false
)
where id = 'plus'
  and not (coalesce(entitlements, '{}'::jsonb) ? 'chatAutoReplyPersonal');

update public.plans
set entitlements = coalesce(entitlements, '{}'::jsonb) || jsonb_build_object(
  'chatAutoReplyPersonal', true,
  'chatAutoReplyBusiness', true
)
where id in ('pro', 'enterprise')
  and not (coalesce(entitlements, '{}'::jsonb) ? 'chatAutoReplyPersonal');

-- 5. Actualización de quota_upgrade_plan para incluir los nuevos entitlements
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

-- 6. Protección exclusiva de Superadmin al editar chatAutoReply* en planes
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
declare
  v_existing jsonb;
  v_old_personal boolean;
  v_old_business boolean;
  v_new_personal boolean;
  v_new_business boolean;
begin
  perform public.assert_plan_admin();
  if p_monthly_price < 0 or p_yearly_price < 0 then
    raise exception 'El precio no puede ser negativo.';
  end if;

  select coalesce(entitlements, '{}'::jsonb)
  into v_existing
  from public.plans
  where id = p_plan_id;

  if p_entitlements is not null then
    v_old_personal := coalesce((v_existing->>'chatAutoReplyPersonal')::boolean, false);
    v_old_business := coalesce((v_existing->>'chatAutoReplyBusiness')::boolean, false);
    v_new_personal := coalesce((p_entitlements->>'chatAutoReplyPersonal')::boolean, v_old_personal);
    v_new_business := coalesce((p_entitlements->>'chatAutoReplyBusiness')::boolean, v_old_business);

    if v_new_personal is distinct from v_old_personal
      or v_new_business is distinct from v_old_business then
      perform public.assert_superadmin();
    end if;
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

-- 7. RPC exclusiva de Superadmin para override individual por usuario sin alterar plan/fechas
create or replace function public.admin_set_user_chat_ai_overrides(
  p_user_id uuid,
  p_personal text default 'inherit',
  p_business text default 'inherit',
  p_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_personal text := lower(btrim(coalesce(p_personal, 'inherit')));
  v_business text := lower(btrim(coalesce(p_business, 'inherit')));
  v_sub public.subscriptions;
  v_overrides jsonb;
begin
  perform public.assert_superadmin();

  if p_user_id is null then
    raise exception 'Usuario no válido.';
  end if;
  if v_reason is null then
    raise exception 'Escribe el motivo del cambio de permisos de IA.';
  end if;
  if v_personal not in ('inherit', 'allow', 'block')
    or v_business not in ('inherit', 'allow', 'block') then
    raise exception 'El valor debe ser inherit, allow o block.';
  end if;

  perform public.expire_lapsed_subscription(p_user_id);

  select *
  into v_sub
  from public.subscriptions
  where user_id = p_user_id
    and status = 'active'
  order by created_at desc
  limit 1
  for update;

  if not found then
    insert into public.subscriptions (user_id, plan_id, status, billing_period, source, started_at, overrides)
    values (p_user_id, 'free', 'active', 'monthly', 'system', now(), '{}'::jsonb)
    returning * into v_sub;
  end if;

  v_overrides := coalesce(v_sub.overrides, '{}'::jsonb);

  if v_personal = 'inherit' then
    v_overrides := v_overrides - 'chatAutoReplyPersonal';
  else
    v_overrides := v_overrides || jsonb_build_object('chatAutoReplyPersonal', v_personal = 'allow');
  end if;

  if v_business = 'inherit' then
    v_overrides := v_overrides - 'chatAutoReplyBusiness';
  else
    v_overrides := v_overrides || jsonb_build_object('chatAutoReplyBusiness', v_business = 'allow');
  end if;

  update public.subscriptions
  set overrides = v_overrides,
      updated_at = now()
  where id = v_sub.id;

  insert into public.subscription_events (
    user_id, subscription_id, actor_id, plan_id, action, source, starts_at, ends_at, reason
  ) values (
    p_user_id, v_sub.id, auth.uid(), v_sub.plan_id, 'chat_ai_override', 'superadmin',
    v_sub.started_at, v_sub.current_period_end,
    format('IA chats (personal=%s, negocios=%s): %s', v_personal, v_business, v_reason)
  );

  insert into public.activity_log (actor_id, entity, entity_id, action, payload)
  values (
    auth.uid(),
    'subscriptions',
    v_sub.id,
    'chat_ai_override',
    jsonb_build_object(
      'target_user_id', p_user_id,
      'personal', v_personal,
      'business', v_business,
      'reason', v_reason
    )
  );

  return public.admin_user_detail(p_user_id);
end;
$$;

revoke all on function public.admin_set_user_chat_ai_overrides(uuid, text, text, text) from public, anon;
grant execute on function public.admin_set_user_chat_ai_overrides(uuid, text, text, text) to authenticated;

-- 8. Extender admin_user_detail con estado resuelto de IA en chats y overrides
create or replace function public.admin_user_detail(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.subscriptions;
  v_plan public.plans;
  v_effective jsonb;
  v_overrides jsonb;
  v_plan_personal boolean;
  v_plan_business boolean;
  v_override_personal text := 'inherit';
  v_override_business text := 'inherit';
begin
  perform public.assert_admin();
  perform public.expire_lapsed_subscription(p_user_id);

  select *
  into v_sub
  from public.subscriptions
  where user_id = p_user_id
    and status = 'active'
  order by created_at desc
  limit 1;

  select * into v_plan from public.plans where id = coalesce(v_sub.plan_id, 'free');
  v_effective := public.resolve_user_entitlements(p_user_id);
  v_overrides := coalesce(v_sub.overrides, '{}'::jsonb);

  v_plan_personal := coalesce((v_plan.entitlements->>'chatAutoReplyPersonal')::boolean, false);
  v_plan_business := coalesce((v_plan.entitlements->>'chatAutoReplyBusiness')::boolean, false);

  if v_overrides ? 'chatAutoReplyPersonal' then
    v_override_personal := case when coalesce((v_overrides->>'chatAutoReplyPersonal')::boolean, false) then 'allow' else 'block' end;
  end if;
  if v_overrides ? 'chatAutoReplyBusiness' then
    v_override_business := case when coalesce((v_overrides->>'chatAutoReplyBusiness')::boolean, false) then 'allow' else 'block' end;
  end if;

  return public.admin_user_json(p_user_id) || jsonb_build_object(
    'isSuperadmin', public.is_superadmin(),
    'chatAutoReply', jsonb_build_object(
      'effectivePersonal', coalesce((v_effective->>'chatAutoReplyPersonal')::boolean, false),
      'effectiveBusiness', coalesce((v_effective->>'chatAutoReplyBusiness')::boolean, false),
      'planPersonal', v_plan_personal,
      'planBusiness', v_plan_business,
      'overridePersonal', v_override_personal,
      'overrideBusiness', v_override_business
    ),
    'transacciones', coalesce((select jsonb_agg(jsonb_build_object('id', pay.id, 'usuarioId', pay.user_id, 'usuarioNombre', trim(p.first_name || ' ' || p.last_name), 'planId', coalesce(pay.plan_id, 'free'), 'tipo', pay.transaction_type, 'estado', pay.status, 'monto', pay.amount, 'fecha', pay.created_at, 'metodoPago', coalesce(pay.payment_method, ''))) from public.payments pay join public.profiles p on p.id = pay.user_id where pay.user_id = p_user_id), '[]'::jsonb),
    'reportes', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'usuarioReportadoId', m.user_id, 'reportadoPor', coalesce((select trim(first_name || ' ' || last_name) from public.profiles where id = m.reporter_id), 'Usuario'), 'motivo', coalesce(m.reason, 'otro'), 'detalle', coalesce(m.detail, ''), 'contenidoReportado', coalesce(m.reported_content, ''), 'fecha', m.created_at, 'estado', coalesce(m.status, 'pendiente'))) from public.moderation m where m.kind = 'report' and m.user_id = p_user_id), '[]'::jsonb),
    'sanciones', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'usuarioId', m.user_id, 'tipo', coalesce(m.sanction_type, 'advertencia'), 'motivo', coalesce(m.reason, ''), 'fecha', m.created_at, 'adminResponsable', coalesce((select trim(first_name || ' ' || last_name) from public.profiles where id = m.admin_id), 'Administrador'))) from public.moderation m where m.kind = 'sanction' and m.user_id = p_user_id), '[]'::jsonb)
  );
end;
$$;

-- 9. Consumo de créditos en segundo plano para la Edge Function (solo service_role)
create or replace function public.consume_ai_credits_for_user(
  p_user_id uuid,
  p_feature text default 'chat_auto_reply',
  p_amount integer default 1,
  p_tool text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entitlements jsonb;
  v_cap numeric;
  v_used numeric;
  v_cost integer := greatest(coalesce(p_amount, 1), 0);
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'No autorizado.';
  end if;

  if p_user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_user');
  end if;

  v_entitlements := public.resolve_user_entitlements(p_user_id);

  if p_tool = 'personal' and coalesce((v_entitlements->>'chatAutoReplyPersonal')::boolean, false) is not true then
    return jsonb_build_object('ok', false, 'reason', 'not_entitled');
  end if;

  if p_tool = 'business' and coalesce((v_entitlements->>'chatAutoReplyBusiness')::boolean, false) is not true then
    return jsonb_build_object('ok', false, 'reason', 'not_entitled');
  end if;

  v_cap := public.entitlement_number(v_entitlements, 'aiCredits');
  v_used := public.meter_used(p_user_id, 'aiCredits');

  if v_cap is not null and v_used + v_cost > v_cap then
    return jsonb_build_object('ok', false, 'reason', 'quota_exceeded', 'used', v_used, 'limit', v_cap);
  end if;

  if v_cost > 0 then
    perform public.add_usage(p_user_id, 'aiCredits', v_cost);
  end if;

  return jsonb_build_object('ok', true, 'used', v_used + v_cost, 'limit', v_cap);
end;
$$;

revoke all on function public.consume_ai_credits_for_user(uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.consume_ai_credits_for_user(uuid, text, integer, text) to service_role;

-- 10. RPCs para estado y toggle por conversación (web y móvil)
create or replace function public.get_conversation_ai_auto_reply(
  p_conversation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_conv public.conversations;
  v_member public.conversation_members;
  v_settings public.assistant_settings;
  v_biz_ai public.business_ai_settings;
  v_entitlements jsonb;
  v_scope text;
  v_entitled boolean := false;
  v_global_enabled boolean := false;
  v_business_enabled boolean := false;
  v_effective boolean := false;
  v_paused_until timestamptz := null;
  v_pause_minutes integer := 30;
begin
  if v_uid is null or not public.has_active_device() then
    raise exception 'No autorizado.';
  end if;

  select * into v_conv from public.conversations where id = p_conversation_id;
  if not found or v_conv.kind not in ('direct', 'business') then
    return jsonb_build_object(
      'conversation_id', p_conversation_id,
      'supported', false,
      'scope', null,
      'entitled', false,
      'global_enabled', false,
      'business_enabled', false,
      'conversation_override', null,
      'effective_enabled', false,
      'paused_until', null,
      'pause_minutes', 30
    );
  end if;

  if v_conv.kind = 'business' then
    -- Solo el dueño del negocio puede controlar la IA comercial de esta conversación
    select m.*
    into v_member
    from public.conversation_members m
    join public.businesses b on b.id = m.business_id
    where m.conversation_id = p_conversation_id
      and m.user_id = v_uid
      and m.business_id = v_conv.business_id
      and m.status = 'active'
      and b.owner_id = v_uid
    limit 1;

    if not found then
      return jsonb_build_object(
        'conversation_id', p_conversation_id,
        'supported', false,
        'scope', 'business',
        'entitled', false,
        'global_enabled', false,
        'business_enabled', false,
        'conversation_override', null,
        'effective_enabled', false,
        'paused_until', null,
        'pause_minutes', 30
      );
    end if;
    v_scope := 'business';
  else
    select *
    into v_member
    from public.conversation_members
    where conversation_id = p_conversation_id
      and user_id = v_uid
      and business_id is null
      and status = 'active'
    limit 1;

    if not found then
      raise exception 'No perteneces a esta conversación.';
    end if;
    v_scope := 'personal';
  end if;

  v_entitlements := public.resolve_user_entitlements(v_uid);
  select * into v_settings from public.assistant_settings where user_id = v_uid;
  v_pause_minutes := coalesce(v_settings.auto_reply_pause_minutes, 30);

  if v_scope = 'business' then
    v_entitled := coalesce((v_entitlements->>'chatAutoReplyBusiness')::boolean, false);
    v_global_enabled := coalesce(v_settings.auto_reply_business_enabled, false);
    select * into v_biz_ai from public.business_ai_settings where business_id = v_conv.business_id;
    v_business_enabled := coalesce(v_biz_ai.enabled, false);
    v_effective := v_entitled
      and coalesce(v_member.ai_auto_reply_enabled, v_global_enabled and v_business_enabled);
  else
    v_entitled := coalesce((v_entitlements->>'chatAutoReplyPersonal')::boolean, false);
    v_global_enabled := coalesce(v_settings.auto_reply_personal_enabled, false);
    v_business_enabled := false;
    v_effective := v_entitled
      and coalesce(v_member.ai_auto_reply_enabled, v_global_enabled);
  end if;

  if v_member.ai_paused_until is not null and v_member.ai_paused_until > now() then
    v_paused_until := v_member.ai_paused_until;
  end if;

  return jsonb_build_object(
    'conversation_id', p_conversation_id,
    'supported', true,
    'scope', v_scope,
    'business_id', v_member.business_id,
    'entitled', v_entitled,
    'global_enabled', v_global_enabled,
    'business_enabled', v_business_enabled,
    'conversation_override', v_member.ai_auto_reply_enabled,
    'effective_enabled', v_effective,
    'paused_until', v_paused_until,
    'pause_minutes', v_pause_minutes
  );
end;
$$;

revoke all on function public.get_conversation_ai_auto_reply(uuid) from public, anon;
grant execute on function public.get_conversation_ai_auto_reply(uuid) to authenticated;

create or replace function public.set_conversation_ai_auto_reply(
  p_conversation_id uuid,
  p_enabled boolean default null,
  p_resume boolean default false,
  p_clear_override boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_conv public.conversations;
  v_member public.conversation_members;
  v_entitlements jsonb;
  v_entitled boolean := false;
  v_metric text;
begin
  if v_uid is null or not public.has_active_device() then
    raise exception 'No autorizado.';
  end if;

  select * into v_conv from public.conversations where id = p_conversation_id;
  if not found or v_conv.kind not in ('direct', 'business') then
    raise exception 'Esta conversación no admite respuestas automáticas de IA.';
  end if;

  v_entitlements := public.resolve_user_entitlements(v_uid);

  if v_conv.kind = 'business' then
    select m.*
    into v_member
    from public.conversation_members m
    join public.businesses b on b.id = m.business_id
    where m.conversation_id = p_conversation_id
      and m.user_id = v_uid
      and m.business_id = v_conv.business_id
      and m.status = 'active'
      and b.owner_id = v_uid
    limit 1;

    if not found then
      raise exception 'Solo el dueño del negocio puede configurar la IA de este chat.';
    end if;
    v_metric := 'chatAutoReplyBusiness';
    v_entitled := coalesce((v_entitlements->>v_metric)::boolean, false);
  else
    select *
    into v_member
    from public.conversation_members
    where conversation_id = p_conversation_id
      and user_id = v_uid
      and business_id is null
      and status = 'active'
    limit 1;

    if not found then
      raise exception 'No perteneces a esta conversación.';
    end if;
    v_metric := 'chatAutoReplyPersonal';
    v_entitled := coalesce((v_entitlements->>v_metric)::boolean, false);
  end if;

  if (p_enabled is true or p_resume is true) and not v_entitled then
    raise exception 'Límite: respuestas automáticas con IA en chats. Necesitas el plan %.', public.quota_upgrade_plan(v_uid, v_metric);
  end if;

  update public.conversation_members
  set ai_auto_reply_enabled = case
        when p_clear_override then null
        when p_enabled is not null then p_enabled
        else ai_auto_reply_enabled
      end,
      ai_paused_until = case
        when p_resume or p_enabled is true then null
        else ai_paused_until
      end
  where id = v_member.id;

  return public.get_conversation_ai_auto_reply(p_conversation_id);
end;
$$;

revoke all on function public.set_conversation_ai_auto_reply(uuid, boolean, boolean, boolean) from public, anon;
grant execute on function public.set_conversation_ai_auto_reply(uuid, boolean, boolean, boolean) to authenticated;

-- 11. Guard anti-spoofing: solo service_role puede marcar ai_generated = true
create or replace function public.guard_message_ai_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    new.ai_generated := false;
    new.ai_reply_to_message_id := null;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_message_ai_columns on public.messages;
create trigger guard_message_ai_columns
before insert on public.messages
for each row execute function public.guard_message_ai_columns();

-- 12. Despachador interno hacia la Edge Function chat-auto-reply
create or replace function public.dispatch_chat_ai_reply_job(
  p_job_id uuid,
  p_ticket uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_endpoint text;
  v_mail_endpoint text;
  v_anon_jwt text;
begin
  select decrypted_secret into v_endpoint
  from vault.decrypted_secrets
  where name = 'buddy_chat_ai_functions_url'
  limit 1;

  if v_endpoint is null then
    select decrypted_secret into v_mail_endpoint
    from vault.decrypted_secrets
    where name = 'buddy_mail_functions_url'
    limit 1;
    if v_mail_endpoint is not null then
      v_endpoint := regexp_replace(v_mail_endpoint, '/mail-sync/?$', '/chat-auto-reply');
    end if;
  end if;

  select decrypted_secret into v_anon_jwt
  from vault.decrypted_secrets
  where name = 'buddy_mail_anon_jwt'
  limit 1;

  if v_endpoint is null or v_anon_jwt is null then
    return;
  end if;

  perform net.http_post(
    url := v_endpoint,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_jwt,
      'apikey', v_anon_jwt
    ),
    body := jsonb_build_object(
      'action', 'process_job',
      'job_id', p_job_id,
      'ticket', p_ticket
    ),
    timeout_milliseconds := 60000
  );
exception
  when others then
    -- Nunca bloquear ni revertir el envío del mensaje; pg_cron reintentará el job pending.
    null;
end;
$$;

revoke all on function public.dispatch_chat_ai_reply_job(uuid, uuid) from public, anon, authenticated, service_role;

-- 13. Trigger AFTER INSERT en public.messages: pausa humana + encolado anti-bucle
create or replace function public.handle_message_chat_ai_auto_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv record;
  v_pause_mins integer;
  v_target_user uuid;
  v_target_business uuid;
  v_scope text;
  v_member record;
  v_settings record;
  v_biz_ai record;
  v_entitlements jsonb;
  v_entitled boolean := false;
  v_should_reply boolean := false;
  v_recent_ai_count integer := 0;
  v_job_id uuid;
  v_ticket uuid;
begin
  if new.deleted_at is not null then
    return new;
  end if;

  -- Paso A: si un humano responde manualmente, pausar su IA temporalmente en este chat
  if new.ai_generated is not true and new.sender_id is not null then
    select coalesce(auto_reply_pause_minutes, 30)
    into v_pause_mins
    from public.assistant_settings
    where user_id = new.sender_id;

    v_pause_mins := coalesce(v_pause_mins, 30);

    update public.conversation_members
    set ai_paused_until = now() + make_interval(mins => v_pause_mins)
    where conversation_id = new.conversation_id
      and user_id = new.sender_id
      and business_id is not distinct from new.sender_business_id
      and status = 'active';
  end if;

  -- Paso B: protección anti-bucle y filtro de mensajes elegibles
  if new.ai_generated is true
    or new.kind is distinct from 'text'
    or btrim(coalesce(new.body, '')) = '' then
    return new;
  end if;

  select id, kind, business_id
  into v_conv
  from public.conversations
  where id = new.conversation_id;

  if not found or v_conv.kind not in ('direct', 'business') then
    return new;
  end if;

  if v_conv.kind = 'business' then
    -- Solo responder cuando escribe el cliente (no el negocio)
    if new.sender_business_id is not null or v_conv.business_id is null then
      return new;
    end if;

    select b.owner_id, b.id
    into v_target_user, v_target_business
    from public.businesses b
    where b.id = v_conv.business_id
      and b.archived_at is null
      and b.suspended_at is null
      and b.owner_id is distinct from new.sender_id;

    if v_target_user is null then
      return new;
    end if;

    select m.ai_auto_reply_enabled, m.ai_paused_until
    into v_member
    from public.conversation_members m
    where m.conversation_id = new.conversation_id
      and m.user_id = v_target_user
      and m.business_id = v_target_business
      and m.status = 'active'
    limit 1;

    if not found then
      return new;
    end if;

    v_scope := 'business';
  else
    -- Chat personal 1-a-1 (direct)
    select m.user_id, m.ai_auto_reply_enabled, m.ai_paused_until
    into v_member
    from public.conversation_members m
    where m.conversation_id = new.conversation_id
      and m.user_id is distinct from new.sender_id
      and m.business_id is null
      and m.status = 'active'
    limit 1;

    if not found or v_member.user_id is null then
      return new;
    end if;

    v_target_user := v_member.user_id;
    v_target_business := null;
    v_scope := 'personal';
  end if;

  -- Si la IA está pausada por intervención humana reciente, no encolar
  if v_member.ai_paused_until is not null and v_member.ai_paused_until > now() then
    return new;
  end if;

  -- Validar entitlement vigente del dueño (plan + overrides del Superadmin)
  v_entitlements := public.resolve_user_entitlements(v_target_user);

  select auto_reply_personal_enabled, auto_reply_business_enabled
  into v_settings
  from public.assistant_settings
  where user_id = v_target_user;

  if v_scope = 'business' then
    v_entitled := coalesce((v_entitlements->>'chatAutoReplyBusiness')::boolean, false);
    select enabled into v_biz_ai from public.business_ai_settings where business_id = v_target_business;
    v_should_reply := v_entitled
      and coalesce(
        v_member.ai_auto_reply_enabled,
        coalesce(v_settings.auto_reply_business_enabled, false) and coalesce(v_biz_ai.enabled, false)
      );
  else
    v_entitled := coalesce((v_entitlements->>'chatAutoReplyPersonal')::boolean, false);
    v_should_reply := v_entitled
      and coalesce(v_member.ai_auto_reply_enabled, coalesce(v_settings.auto_reply_personal_enabled, false));
  end if;

  if not v_should_reply then
    return new;
  end if;

  -- Límite anti-spam: máximo 5 respuestas automáticas en 2 minutos por conversación
  select count(*)::int
  into v_recent_ai_count
  from public.messages m
  where m.conversation_id = new.conversation_id
    and m.ai_generated = true
    and m.created_at >= now() - interval '2 minutes';

  if v_recent_ai_count >= 5 then
    return new;
  end if;

  insert into public.chat_ai_reply_jobs (
    conversation_id,
    trigger_message_id,
    target_user_id,
    target_business_id,
    scope
  ) values (
    new.conversation_id,
    new.id,
    v_target_user,
    v_target_business,
    v_scope
  )
  on conflict (trigger_message_id, target_user_id) do nothing
  returning id, dispatch_ticket into v_job_id, v_ticket;

  if v_job_id is not null then
    perform public.dispatch_chat_ai_reply_job(v_job_id, v_ticket);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_messages_chat_ai_auto_reply on public.messages;
create trigger trg_messages_chat_ai_auto_reply
after insert on public.messages
for each row execute function public.handle_message_chat_ai_auto_reply();

-- 14. Cron de respaldo por minuto para reintentar jobs pendientes
create or replace function public.dispatch_due_chat_ai_replies()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job record;
  v_count integer := 0;
begin
  for v_job in
    with due as (
      select id
      from public.chat_ai_reply_jobs
      where (
        (status = 'pending' and created_at <= now() - interval '10 seconds')
        or (status = 'processing' and updated_at <= now() - interval '2 minutes')
      )
        and attempts < 3
      order by created_at asc
      limit 15
      for update skip locked
    )
    update public.chat_ai_reply_jobs j
    set status = 'pending',
        dispatch_ticket = gen_random_uuid(),
        updated_at = now()
    from due
    where j.id = due.id
    returning j.id, j.dispatch_ticket
  loop
    perform public.dispatch_chat_ai_reply_job(v_job.id, v_job.dispatch_ticket);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.dispatch_due_chat_ai_replies() from public, anon, authenticated, service_role;

do $$
begin
  if not exists (
    select 1 from vault.secrets where name = 'buddy_chat_ai_functions_url'
  ) then
    perform vault.create_secret(
      'https://elwnmmznlqihruveqlye.supabase.co/functions/v1/chat-auto-reply',
      'buddy_chat_ai_functions_url',
      'URL de Edge Function para auto-respuesta IA en chats'
    );
  end if;

  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if not exists (select 1 from cron.job where jobname = 'buddy-chat-ai-auto-reply') then
      perform cron.schedule(
        'buddy-chat-ai-auto-reply',
        '* * * * *',
        'select public.dispatch_due_chat_ai_replies();'
      );
    end if;
  end if;
end $$;

notify pgrst, 'reload schema';
