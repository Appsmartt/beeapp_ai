-- Configuración, conversación y memoria del asistente.
-- La clave de OpenAI no vive aquí: solo datos del propio usuario.

create table public.assistant_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  name text not null default 'Buddy AI',
  tone text not null default 'neutro',
  voice text not null default 'alloy',
  voice_activation boolean not null default false,
  assistance_level text not null default 'confirmar',
  memory_enabled boolean not null default true,
  permissions jsonb not null default jsonb_build_object(
    'calendar', true,
    'notes', true,
    'mail', true,
    'marketplace', true,
    'send_messages', true
  ),
  language text not null default 'es',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assistant_settings_name_len check (char_length(btrim(name)) between 1 and 40),
  constraint assistant_settings_tone_check check (tone in ('formal', 'cercano', 'neutro')),
  constraint assistant_settings_voice_len check (char_length(voice) between 1 and 40),
  constraint assistant_settings_level_check check (
    assistance_level in ('sugerir', 'confirmar', 'automatico')
  ),
  constraint assistant_settings_language_len check (char_length(language) between 2 and 8)
);

create table public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  content text not null default '',
  cards jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint assistant_messages_role_check check (role in ('user', 'assistant', 'system')),
  constraint assistant_messages_content_len check (char_length(content) <= 12000)
);

create index assistant_messages_user_created_idx
  on public.assistant_messages (user_id, created_at desc);

create table public.assistant_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  constraint assistant_memories_content_len check (char_length(btrim(content)) between 1 and 500)
);

create index assistant_memories_user_created_idx
  on public.assistant_memories (user_id, created_at desc);

create table public.assistant_pending_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tool_name text not null,
  payload jsonb not null default '{}'::jsonb,
  summary text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint assistant_pending_actions_status_check check (
    status in ('pending', 'confirmed', 'cancelled')
  ),
  constraint assistant_pending_actions_tool_len check (char_length(tool_name) between 1 and 80),
  constraint assistant_pending_actions_summary_len check (char_length(summary) between 1 and 400)
);

create index assistant_pending_actions_user_status_idx
  on public.assistant_pending_actions (user_id, status, created_at desc);

insert into public.assistant_settings (user_id, name, tone)
select
  profile.id,
  left(coalesce(nullif(btrim(profile.assistant_name), ''), 'Buddy AI'), 40),
  case lower(coalesce(profile.assistant_tone, ''))
    when 'formal' then 'formal'
    when 'profesional' then 'formal'
    when 'professional' then 'formal'
    when 'cercano' then 'cercano'
    when 'amigable' then 'cercano'
    when 'friendly' then 'cercano'
    else 'neutro'
  end
from public.profiles as profile
on conflict (user_id) do nothing;

alter table public.assistant_settings enable row level security;
alter table public.assistant_messages enable row level security;
alter table public.assistant_memories enable row level security;
alter table public.assistant_pending_actions enable row level security;

create policy assistant_settings_select
  on public.assistant_settings
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy assistant_settings_insert
  on public.assistant_settings
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy assistant_settings_update
  on public.assistant_settings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy assistant_settings_delete
  on public.assistant_settings
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy assistant_settings_device
  on public.assistant_settings
  as restrictive
  for all
  to authenticated
  using (public.has_active_device())
  with check (public.has_active_device());

create policy assistant_messages_select
  on public.assistant_messages
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy assistant_messages_insert
  on public.assistant_messages
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy assistant_messages_update
  on public.assistant_messages
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy assistant_messages_delete
  on public.assistant_messages
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy assistant_messages_device
  on public.assistant_messages
  as restrictive
  for all
  to authenticated
  using (public.has_active_device())
  with check (public.has_active_device());

create policy assistant_memories_select
  on public.assistant_memories
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy assistant_memories_insert
  on public.assistant_memories
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy assistant_memories_update
  on public.assistant_memories
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy assistant_memories_delete
  on public.assistant_memories
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy assistant_memories_device
  on public.assistant_memories
  as restrictive
  for all
  to authenticated
  using (public.has_active_device())
  with check (public.has_active_device());

create policy assistant_pending_select
  on public.assistant_pending_actions
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy assistant_pending_insert
  on public.assistant_pending_actions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy assistant_pending_update
  on public.assistant_pending_actions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy assistant_pending_delete
  on public.assistant_pending_actions
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy assistant_pending_device
  on public.assistant_pending_actions
  as restrictive
  for all
  to authenticated
  using (public.has_active_device())
  with check (public.has_active_device());

grant select, insert, update, delete on
  public.assistant_settings,
  public.assistant_messages,
  public.assistant_memories,
  public.assistant_pending_actions
to authenticated;

-- Ofertas publicadas, ordenadas por el texto y por la ciudad del perfil.
create or replace function public.search_marketplace_providers(
  p_query text default '',
  p_limit integer default 5
)
returns jsonb
language plpgsql
stable
security definer
set search_path to public
as $function$
declare
  v_user uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 5), 3), 5);
  v_query text := replace(replace(left(btrim(coalesce(p_query, '')), 120), '%', ''), '_', ' ');
  v_city text;
begin
  if v_user is null then
    raise exception 'No autorizado';
  end if;

  select nullif(btrim(location), '')
    into v_city
  from public.profiles
  where id = v_user;

  return coalesce((
    select jsonb_agg(to_jsonb(provider_match) order by provider_match.match_rank, provider_match.title)
    from (
      select
        offer.id as offer_id,
        offer.title,
        left(coalesce(offer.description, ''), 280) as description,
        business.id as business_id,
        business.display_name as business_name,
        business.city,
        category.name as category_name,
        case
          when v_city is not null and business.city ilike '%' || v_city || '%' then 0
          else 1
        end
        + case
          when v_query = '' then 0
          when offer.title ilike '%' || v_query || '%' then 0
          when category.name ilike '%' || v_query || '%' then 1
          when business.display_name ilike '%' || v_query || '%' then 1
          else 2
        end as match_rank
      from public.offers as offer
      join public.businesses as business
        on business.id = offer.business_id
      left join public.categories as category
        on category.id = business.category_id
      where business.is_public = true
        and business.publication_status = 'published'
        and business.archived_at is null
        and offer.archived_at is null
        and offer.is_available = true
        and offer.status in ('published', 'active')
        and (
          v_query = ''
          or offer.title ilike '%' || v_query || '%'
          or coalesce(offer.description, '') ilike '%' || v_query || '%'
          or coalesce(category.name, '') ilike '%' || v_query || '%'
          or business.display_name ilike '%' || v_query || '%'
          or coalesce(business.city, '') ilike '%' || v_query || '%'
        )
      order by match_rank, offer.title
      limit v_limit
    ) as provider_match
  ), '[]'::jsonb);
end;
$function$;

revoke all on function public.search_marketplace_providers(text, integer) from public, anon;
grant execute on function public.search_marketplace_providers(text, integer) to authenticated;
