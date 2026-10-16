-- 28 tablas compactas. Lo secundario vive en jsonb o arreglos.

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key,
  first_name text not null default '',
  last_name text not null default '',
  email text,
  phone_dial_code text,
  phone_number text,
  normalized_phone text,
  role text not null default 'USER' check (role in ('USER', 'ADMIN', 'SUPER_ADMIN')),
  occupation text,
  location text,
  timezone text not null default 'America/Bogota',
  assistant_name text,
  assistant_tone text,
  avatar_file_id uuid,
  is_public boolean not null default true,
  account_status text not null default 'active',
  network_visibility text not null default 'public',
  verification_status text not null default 'unverified',
  security_pin_hash text,
  pin_failed_attempts integer not null default 0,
  pin_locked_until timestamptz,
  social_links jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  storage_quota_bytes bigint not null default 5368709120,
  storage_used_bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_name text,
  device_type text not null default 'MOBILE' check (device_type in ('WEB', 'MOBILE', 'DESKTOP')),
  platform text,
  browser text,
  user_agent text,
  session_token_hash text not null unique,
  auth_session_id uuid,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  expo_push_token text,
  onesignal_subscription_id text,
  app_version text,
  created_at timestamptz not null default now()
);
create unique index devices_user_auth_session_uidx
  on public.devices (user_id, auth_session_id)
  where auth_session_id is not null;
create index devices_user_id_idx on public.devices (user_id);

create table public.qr_logins (
  id uuid primary key default gen_random_uuid(),
  device_id uuid references public.devices(id) on delete set null,
  token_hash text not null unique,
  browser_nonce_hash text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'consumed', 'expired')),
  expires_at timestamptz not null,
  approved_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index qr_logins_device_id_idx on public.qr_logins (device_id);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  linked_user_id uuid references public.profiles(id) on delete cascade,
  kind text not null default 'contact' check (kind in ('contact', 'follow', 'block')),
  display_name text,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contacts_owner_id_idx on public.contacts (owner_id);
create index contacts_linked_user_id_idx on public.contacts (linked_user_id);
create unique index contacts_owner_link_kind_uidx
  on public.contacts (owner_id, linked_user_id, kind)
  where linked_user_id is not null;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  offer_type text not null check (offer_type in ('products', 'services', 'mixed')),
  name text not null,
  slug text not null unique,
  normalized_name text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index categories_parent_id_idx on public.categories (parent_id);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  offer_type text not null default 'products',
  category_id uuid references public.categories(id) on delete set null,
  category_ids uuid[] not null default '{}',
  display_name text not null,
  description text,
  custom_activity_text text,
  country_code text,
  city text,
  address text,
  neighborhood text,
  location_reference text,
  is_address_public boolean not null default false,
  phone_dial_code text,
  phone_number text,
  is_phone_public boolean not null default false,
  public_email text,
  is_email_public boolean not null default false,
  logo_file_id uuid,
  is_public boolean not null default false,
  is_available boolean not null default true,
  publication_status text not null default 'draft',
  verification_status text not null default 'not_requested',
  verification_badge_visible boolean not null default false,
  verification jsonb not null default '{}'::jsonb,
  timezone text not null default 'America/Bogota',
  hours jsonb not null default '[]'::jsonb,
  modalities text[] not null default '{}',
  payment_methods jsonb not null default '[]'::jsonb,
  social_links jsonb not null default '[]'::jsonb,
  delivery_fee_mode text not null default 'not_offered',
  delivery_fee_amount bigint,
  delivery_currency_code text default 'COP',
  booking_hold_minutes integer not null default 30,
  inventory_hold_minutes integer not null default 30,
  cash_on_delivery_enabled boolean not null default false,
  archived_at timestamptz,
  suspended_at timestamptz,
  suspension_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index businesses_owner_id_idx on public.businesses (owner_id);
create index businesses_category_id_idx on public.businesses (category_id);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('direct', 'group', 'business', 'community')),
  name text,
  description text,
  image_file_id uuid,
  category text,
  owner_id uuid references public.profiles(id) on delete set null,
  business_id uuid references public.businesses(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversations_owner_id_idx on public.conversations (owner_id);
create index conversations_business_id_idx on public.conversations (business_id);

create table public.conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  status text not null default 'active' check (status in ('active', 'invited', 'left')),
  last_read_at timestamptz,
  last_read_seq bigint not null default 0,
  pinned boolean not null default false,
  muted boolean not null default false,
  category text,
  pin_hash text,
  joined_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);
create index conversation_members_conversation_id_idx on public.conversation_members (conversation_id);
create index conversation_members_user_id_idx on public.conversation_members (user_id);
create index conversation_members_business_id_idx on public.conversation_members (business_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  sender_business_id uuid references public.businesses(id) on delete set null,
  body text,
  kind text not null default 'text',
  attachments jsonb not null default '[]'::jsonb,
  reactions jsonb not null default '[]'::jsonb,
  reply_to_id uuid references public.messages(id) on delete set null,
  seq bigint generated always as identity,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);
create index messages_conversation_seq_idx on public.messages (conversation_id, seq);
create index messages_sender_id_idx on public.messages (sender_id);
create index messages_sender_business_id_idx on public.messages (sender_business_id);
create index messages_reply_to_id_idx on public.messages (reply_to_id);

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete set null,
  started_by uuid references public.profiles(id) on delete set null,
  kind text not null default 'audio' check (kind in ('audio', 'video')),
  status text not null default 'ringing' check (status in ('ringing', 'active', 'ended', 'declined', 'missed', 'cancelled')),
  participants jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index calls_conversation_id_idx on public.calls (conversation_id);
create index calls_started_by_idx on public.calls (started_by);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'file' check (kind in ('file', 'folder')),
  parent_id uuid references public.files(id) on delete cascade,
  name text not null,
  bucket text,
  path text,
  mime_type text,
  size_bytes bigint not null default 0,
  tags text[] not null default '{}',
  shared_with uuid[] not null default '{}',
  upload_status text not null default 'ready' check (upload_status in ('pending', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index files_owner_id_idx on public.files (owner_id);
create index files_parent_id_idx on public.files (parent_id);

alter table public.profiles
  add constraint profiles_avatar_file_id_fkey
  foreign key (avatar_file_id) references public.files(id) on delete set null;
alter table public.businesses
  add constraint businesses_logo_file_id_fkey
  foreign key (logo_file_id) references public.files(id) on delete set null;
alter table public.conversations
  add constraint conversations_image_file_id_fkey
  foreign key (image_file_id) references public.files(id) on delete set null;
create index profiles_avatar_file_id_idx on public.profiles (avatar_file_id);
create index businesses_logo_file_id_idx on public.businesses (logo_file_id);
create index conversations_image_file_id_idx on public.conversations (image_file_id);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default '',
  body jsonb not null default '{}'::jsonb,
  folder text,
  tags text[] not null default '{}',
  shared_with jsonb not null default '[]'::jsonb,
  attachments uuid[] not null default '{}',
  is_template boolean not null default false,
  is_pinned boolean not null default false,
  is_favorite boolean not null default false,
  archived_at timestamptz,
  trashed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_owner_id_idx on public.notes (owner_id);

create table public.statuses (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text,
  media jsonb not null default '[]'::jsonb,
  layers jsonb not null default '[]'::jsonb,
  background jsonb,
  offer_ids uuid[] not null default '{}',
  expires_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index statuses_author_id_idx on public.statuses (author_id);

create table public.status_views (
  status_id uuid not null references public.statuses(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (status_id, viewer_id)
);
create index status_views_viewer_id_idx on public.status_views (viewer_id);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  catalog text,
  offer_kind text not null default 'product',
  title text not null,
  description text,
  pricing_strategy text,
  base_price_amount bigint,
  currency_code text default 'COP',
  is_available boolean not null default true,
  sort_order integer not null default 0,
  status text not null default 'active',
  images jsonb not null default '[]'::jsonb,
  modalities text[] not null default '{}',
  track_inventory boolean not null default false,
  stock_quantity integer,
  duration_minutes integer,
  requires_booking boolean not null default false,
  payment_policy text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index offers_business_id_idx on public.offers (business_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  currency_code text not null default 'COP',
  total_amount bigint not null default 0,
  items jsonb not null default '[]'::jsonb,
  proposals jsonb not null default '[]'::jsonb,
  payment_proofs jsonb not null default '[]'::jsonb,
  reservation jsonb,
  dispute jsonb,
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_business_id_idx on public.orders (business_id);
create index orders_customer_id_idx on public.orders (customer_id);

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('google', 'microsoft')),
  capabilities text[] not null default '{}',
  status text not null default 'pending',
  provider_email text,
  provider_account_id text,
  provider_display_name text,
  granted_scopes text[] not null default '{}',
  access_token_ciphertext text,
  refresh_token_ciphertext text,
  token_expires_at timestamptz,
  sync_state jsonb not null default '{}'::jsonb,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index integrations_user_id_idx on public.integrations (user_id);

create table public.calendars (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  color text,
  timezone text not null default 'America/Bogota',
  visibility text not null default 'private',
  is_default boolean not null default false,
  is_archived boolean not null default false,
  shared_with jsonb not null default '[]'::jsonb,
  integration_id uuid references public.integrations(id) on delete set null,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index calendars_owner_id_idx on public.calendars (owner_id);
create index calendars_integration_id_idx on public.calendars (integration_id);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  organizer_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  kind text not null default 'in_person',
  status text not null default 'confirmed',
  starts_at timestamptz,
  ends_at timestamptz,
  starts_on date,
  ends_on date,
  is_all_day boolean not null default false,
  timezone text not null default 'America/Bogota',
  location_name text,
  location_address text,
  color text,
  tags text[] not null default '{}',
  recurrence jsonb,
  attendees jsonb not null default '[]'::jsonb,
  reminders jsonb not null default '[]'::jsonb,
  conference jsonb,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index events_calendar_id_idx on public.events (calendar_id);
create index events_organizer_id_idx on public.events (organizer_id);

create table public.mail_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  integration_id uuid references public.integrations(id) on delete set null,
  folder text not null default 'inbox',
  subject text,
  body text,
  snippet text,
  from_address text,
  recipients jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  actions jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  is_starred boolean not null default false,
  is_draft boolean not null default false,
  external_id text,
  received_at timestamptz,
  created_at timestamptz not null default now()
);
create index mail_messages_user_id_idx on public.mail_messages (user_id);
create index mail_messages_integration_id_idx on public.mail_messages (integration_id);

create table public.notification_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  recipient_mode text not null,
  segment jsonb not null default '{}'::jsonb,
  recipient_count integer not null default 0,
  status text not null default 'draft',
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index notification_campaigns_created_by_idx on public.notification_campaigns (created_by);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  body text,
  kind text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  push_status text not null default 'pending',
  campaign_id uuid references public.notification_campaigns(id) on delete set null,
  created_at timestamptz not null default now()
);
create index notifications_user_id_idx on public.notifications (user_id);
create index notifications_campaign_id_idx on public.notifications (campaign_id);

create table public.plans (
  id text primary key,
  name text not null,
  description text,
  monthly_price numeric not null default 0,
  yearly_price numeric not null default 0,
  storage_gb integer not null default 5,
  device_limit integer not null default 1,
  offer_limit integer not null default 0,
  features jsonb not null default '{}'::jsonb,
  highlights text[] not null default '{}',
  color text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text not null references public.plans(id),
  status text not null default 'active',
  billing_period text not null default 'monthly',
  started_at timestamptz not null default now(),
  current_period_end timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_user_id_idx on public.subscriptions (user_id);
create index subscriptions_plan_id_idx on public.subscriptions (plan_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text references public.plans(id),
  subscription_id uuid references public.subscriptions(id) on delete set null,
  transaction_type text not null default 'charge',
  status text not null default 'pending',
  amount numeric not null default 0,
  payment_method text,
  created_at timestamptz not null default now()
);
create index payments_user_id_idx on public.payments (user_id);
create index payments_plan_id_idx on public.payments (plan_id);
create index payments_subscription_id_idx on public.payments (subscription_id);

create table public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table public.moderation (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('report', 'sanction')),
  user_id uuid references public.profiles(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  admin_id uuid references public.profiles(id) on delete set null,
  reason text,
  detail text,
  reported_content text,
  status text,
  sanction_type text,
  created_at timestamptz not null default now()
);
create index moderation_user_id_idx on public.moderation (user_id);
create index moderation_reporter_id_idx on public.moderation (reporter_id);
create index moderation_admin_id_idx on public.moderation (admin_id);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  entity text not null,
  entity_id uuid,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_log_actor_id_idx on public.activity_log (actor_id);

do $$
declare r record;
begin
  for r in
    select table_name
    from information_schema.columns
    where table_schema = 'public' and column_name = 'updated_at'
  loop
    execute format(
      'create trigger touch_%I before update on public.%I for each row execute function public.touch_updated_at()',
      r.table_name, r.table_name
    );
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.qr_logins enable row level security;
alter table public.contacts enable row level security;
alter table public.categories enable row level security;
alter table public.businesses enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.calls enable row level security;
alter table public.files enable row level security;
alter table public.notes enable row level security;
alter table public.statuses enable row level security;
alter table public.status_views enable row level security;
alter table public.offers enable row level security;
alter table public.orders enable row level security;
alter table public.integrations enable row level security;
alter table public.calendars enable row level security;
alter table public.events enable row level security;
alter table public.mail_messages enable row level security;
alter table public.notification_campaigns enable row level security;
alter table public.notifications enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.app_settings enable row level security;
alter table public.moderation enable row level security;
alter table public.activity_log enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated, service_role;
revoke all on all tables in schema public from anon;
grant select on public.categories, public.businesses, public.offers to anon;
