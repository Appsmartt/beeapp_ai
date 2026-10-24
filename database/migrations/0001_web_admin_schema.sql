-- Panel web unificado: roles de admin, catálogo de planes y datos que el panel
-- no puede inventar. No borra tablas existentes.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profile
    where id = auth.uid()
      and role in ('ADMIN', 'SUPERADMIN')
  );
$$;

create or replace function public.assert_admin()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if not public.beeapp_has_active_auth_device_session() then
    raise exception 'DEVICE_SESSION_REQUIRED' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.assert_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.assert_admin() to authenticated;

alter table public.profile
  add column if not exists account_status text not null default 'activo',
  add column if not exists network_visibility text not null default 'publico',
  add column if not exists verification_status text not null default 'no_solicitado',
  add column if not exists created_at timestamptz;

alter table public.profile drop constraint if exists profile_account_status_check;
alter table public.profile
  add constraint profile_account_status_check
  check (account_status in ('activo', 'inactivo', 'suspendido', 'pendiente', 'bloqueado'));

alter table public.profile drop constraint if exists profile_network_visibility_check;
alter table public.profile
  add constraint profile_network_visibility_check
  check (network_visibility in ('publico', 'privado', 'solo_equipo'));

alter table public.profile drop constraint if exists profile_verification_status_check;
alter table public.profile
  add constraint profile_verification_status_check
  check (verification_status in ('verificado', 'pendiente', 'no_solicitado'));

update public.profile
set network_visibility = case when is_public then 'publico' else 'privado' end
where network_visibility = 'publico';

update public.profile as profile_row
set created_at = users.created_at
from auth.users as users
where users.id = profile_row.id
  and profile_row.created_at is null;

update public.profile
set created_at = now()
where created_at is null;

alter table public.profile
  alter column created_at set default now();

alter table public.profile
  alter column created_at set not null;

create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  new.role := old.role;
  new.account_status := old.account_status;
  new.verification_status := old.verification_status;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileged_columns on public.profile;
create trigger protect_profile_privileged_columns
before update on public.profile
for each row
execute function public.protect_profile_privileged_columns();

drop policy if exists profile_admin_select on public.profile;
create policy profile_admin_select
on public.profile
for select
to authenticated
using (public.is_admin());

create table if not exists public.plans (
  id text primary key,
  name text not null,
  description text not null default '',
  monthly_price numeric(12, 2) not null default 0,
  yearly_price numeric(12, 2) not null default 0,
  storage_gb integer not null default 1,
  device_limit integer not null default 1,
  offer_limit integer not null default 0,
  features jsonb not null default '{}'::jsonb,
  highlights text[] not null default '{}',
  color text not null default '#6025d2',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.plans (
  id, name, description, monthly_price, yearly_price,
  storage_gb, device_limit, offer_limit, features, highlights, color, sort_order
) values
  (
    'free', 'Free', 'Acceso básico a mensajería y funciones esenciales.',
    0, 0, 1, 1, 0,
    '{"sinPublicidad":false,"copiasNube":false,"chatsOcultos":false,"firmaDigital":false,"historialVersiones":false,"catalogoAvanzado":false,"perfilDestacado":false}'::jsonb,
    array['Mensajería 1 a 1', 'Hasta 3 grupos', '1 GB de almacenamiento'],
    '#ADB5BD', 1
  ),
  (
    'plus', 'Plus', 'Ideal para equipos pequeños que necesitan más capacidad.',
    9900, 99000, 20, 3, 1,
    '{"sinPublicidad":true,"copiasNube":true,"chatsOcultos":false,"firmaDigital":false,"historialVersiones":false,"catalogoAvanzado":false,"perfilDestacado":false}'::jsonb,
    array['Grupos ilimitados', 'Videollamadas grupales', '20 GB de almacenamiento'],
    '#7C3AED', 2
  ),
  (
    'pro', 'Pro', 'Para empresas en crecimiento con necesidades avanzadas.',
    24900, 249000, 100, 5, 3,
    '{"sinPublicidad":true,"copiasNube":true,"chatsOcultos":true,"firmaDigital":false,"historialVersiones":true,"catalogoAvanzado":true,"perfilDestacado":false}'::jsonb,
    array['Canales por departamento', 'Asistente IA', '100 GB de almacenamiento'],
    '#6025d2', 3
  ),
  (
    'enterprise', 'Enterprise', 'Solución completa con soporte dedicado y almacenamiento ampliado.',
    59900, 599000, 0, 10, 10,
    '{"sinPublicidad":true,"copiasNube":true,"chatsOcultos":true,"firmaDigital":true,"historialVersiones":true,"catalogoAvanzado":true,"perfilDestacado":true}'::jsonb,
    array['SSO y auditoría avanzada', 'Soporte prioritario 24/7', 'Almacenamiento ilimitado'],
    '#5B2CD9', 4
  )
on conflict (id) do nothing;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile (id) on delete cascade,
  plan_id text not null references public.plans (id),
  status text not null default 'active'
    check (status in ('active', 'cancelled', 'past_due')),
  billing_period text not null default 'monthly'
    check (billing_period in ('monthly', 'yearly')),
  started_at timestamptz not null default now(),
  current_period_end timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists subscriptions_one_active_per_user
  on public.subscriptions (user_id)
  where status = 'active';

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile (id) on delete cascade,
  plan_id text not null references public.plans (id),
  subscription_id uuid references public.subscriptions (id) on delete set null,
  transaction_type text not null
    check (transaction_type in ('alta', 'renovacion', 'cancelacion', 'reembolso')),
  status text not null
    check (status in ('pagado', 'pendiente', 'fallido', 'reembolsado')),
  amount numeric(12, 2) not null default 0,
  payment_method text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reported_user_id uuid not null references public.profile (id) on delete cascade,
  reporter_id uuid references public.profile (id) on delete set null,
  reason text not null
    check (reason in ('spam', 'acoso', 'contenido_inapropiado', 'suplantacion', 'otro')),
  detail text not null default '',
  reported_content text not null default '',
  status text not null default 'pendiente'
    check (status in ('pendiente', 'revisado', 'descartado')),
  created_at timestamptz not null default now()
);

create table if not exists public.user_sanctions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profile (id) on delete cascade,
  sanction_type text not null
    check (sanction_type in ('bloqueo', 'suspension', 'reactivacion', 'advertencia')),
  reason text not null,
  admin_id uuid references public.profile (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_notification_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  recipient_mode text not null
    check (recipient_mode in ('todos', 'segmento', 'especificos')),
  segment jsonb not null default '{}'::jsonb,
  recipient_count integer not null default 0,
  status text not null default 'enviada'
    check (status in ('enviada', 'programada', 'fallida', 'cancelada')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_by uuid references public.profile (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_notification_recipients (
  campaign_id uuid not null references public.admin_notification_campaigns (id) on delete cascade,
  user_id uuid not null references public.profile (id) on delete cascade,
  notification_id uuid references public.notifications (id) on delete set null,
  primary key (campaign_id, user_id)
);

create or replace function public.assign_default_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (user_id, plan_id, status, billing_period)
  select new.id, 'free', 'active', 'monthly'
  where not exists (
    select 1
    from public.subscriptions
    where user_id = new.id
      and status = 'active'
  );

  return new;
end;
$$;

drop trigger if exists assign_default_subscription on public.profile;
create trigger assign_default_subscription
after insert on public.profile
for each row
execute function public.assign_default_subscription();

insert into public.subscriptions (user_id, plan_id, status, billing_period)
select profile.id, 'free', 'active', 'monthly'
from public.profile as profile
where not exists (
  select 1
  from public.subscriptions as subscription
  where subscription.user_id = profile.id
    and subscription.status = 'active'
);

alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.user_reports enable row level security;
alter table public.user_sanctions enable row level security;
alter table public.admin_notification_campaigns enable row level security;
alter table public.admin_notification_recipients enable row level security;

revoke all on table public.plans from anon, authenticated;
revoke all on table public.subscriptions from anon, authenticated;
revoke all on table public.payment_transactions from anon, authenticated;
revoke all on table public.user_reports from anon, authenticated;
revoke all on table public.user_sanctions from anon, authenticated;
revoke all on table public.admin_notification_campaigns from anon, authenticated;
revoke all on table public.admin_notification_recipients from anon, authenticated;

grant select on table public.plans to authenticated;
grant select on table public.subscriptions to authenticated;
grant select on table public.payment_transactions to authenticated;
grant select on table public.user_reports to authenticated;
grant select on table public.user_sanctions to authenticated;
grant select on table public.admin_notification_campaigns to authenticated;
grant select on table public.admin_notification_recipients to authenticated;

drop policy if exists plans_select on public.plans;
create policy plans_select on public.plans
for select to authenticated
using (true);

drop policy if exists plans_device_session on public.plans;
create policy plans_device_session on public.plans
as restrictive for all to authenticated
using (public.beeapp_has_active_auth_device_session())
with check (public.beeapp_has_active_auth_device_session());

drop policy if exists subscriptions_select on public.subscriptions;
create policy subscriptions_select on public.subscriptions
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists subscriptions_device_session on public.subscriptions;
create policy subscriptions_device_session on public.subscriptions
as restrictive for all to authenticated
using (public.beeapp_has_active_auth_device_session())
with check (public.beeapp_has_active_auth_device_session());

drop policy if exists payment_transactions_select on public.payment_transactions;
create policy payment_transactions_select on public.payment_transactions
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists payment_transactions_device_session on public.payment_transactions;
create policy payment_transactions_device_session on public.payment_transactions
as restrictive for all to authenticated
using (public.beeapp_has_active_auth_device_session())
with check (public.beeapp_has_active_auth_device_session());

drop policy if exists user_reports_select on public.user_reports;
create policy user_reports_select on public.user_reports
for select to authenticated
using (
  public.is_admin()
  or reporter_id = auth.uid()
  or reported_user_id = auth.uid()
);

drop policy if exists user_reports_device_session on public.user_reports;
create policy user_reports_device_session on public.user_reports
as restrictive for all to authenticated
using (public.beeapp_has_active_auth_device_session())
with check (public.beeapp_has_active_auth_device_session());

drop policy if exists user_sanctions_select on public.user_sanctions;
create policy user_sanctions_select on public.user_sanctions
for select to authenticated
using (public.is_admin() or user_id = auth.uid());

drop policy if exists user_sanctions_device_session on public.user_sanctions;
create policy user_sanctions_device_session on public.user_sanctions
as restrictive for all to authenticated
using (public.beeapp_has_active_auth_device_session())
with check (public.beeapp_has_active_auth_device_session());

drop policy if exists admin_campaigns_select on public.admin_notification_campaigns;
create policy admin_campaigns_select on public.admin_notification_campaigns
for select to authenticated
using (public.is_admin());

drop policy if exists admin_campaigns_device_session on public.admin_notification_campaigns;
create policy admin_campaigns_device_session on public.admin_notification_campaigns
as restrictive for all to authenticated
using (public.beeapp_has_active_auth_device_session())
with check (public.beeapp_has_active_auth_device_session());

drop policy if exists admin_campaign_recipients_select on public.admin_notification_recipients;
create policy admin_campaign_recipients_select on public.admin_notification_recipients
for select to authenticated
using (public.is_admin() or user_id = auth.uid());

drop policy if exists admin_campaign_recipients_device_session on public.admin_notification_recipients;
create policy admin_campaign_recipients_device_session on public.admin_notification_recipients
as restrictive for all to authenticated
using (public.beeapp_has_active_auth_device_session())
with check (public.beeapp_has_active_auth_device_session());
