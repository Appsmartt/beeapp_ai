-- Categorías de chat, presencia y PIN de seguridad / candado de chat.

create table public.chat_categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  icon text not null default 'Users',
  color text not null default '#6025D2',
  created_at timestamptz not null default now(),
  constraint chat_categories_name_len check (char_length(btrim(name)) between 1 and 40),
  constraint chat_categories_icon_len check (char_length(icon) between 1 and 40),
  constraint chat_categories_color_len check (char_length(color) between 1 and 20)
);

create index chat_categories_owner_idx
  on public.chat_categories (owner_id, created_at);

create table public.chat_category_assignments (
  category_id uuid not null references public.chat_categories(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (category_id, conversation_id)
);

create index chat_category_assignments_owner_conversation_idx
  on public.chat_category_assignments (owner_id, conversation_id);

create table public.chat_presence (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  online boolean not null default false,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.chat_categories enable row level security;
alter table public.chat_category_assignments enable row level security;
alter table public.chat_presence enable row level security;

create policy chat_categories_own on public.chat_categories
  for all to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin())
  with check (owner_id = (select auth.uid()) or public.is_admin());

create policy chat_category_assignments_own on public.chat_category_assignments
  for all to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin())
  with check (owner_id = (select auth.uid()) or public.is_admin());

create policy chat_presence_own on public.chat_presence
  for all to authenticated
  using (user_id = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()) or public.is_admin());

create policy device_required on public.chat_categories
  as restrictive for all to authenticated
  using (public.has_active_device())
  with check (public.has_active_device());

create policy device_required on public.chat_category_assignments
  as restrictive for all to authenticated
  using (public.has_active_device())
  with check (public.has_active_device());

create policy device_required on public.chat_presence
  as restrictive for all to authenticated
  using (public.has_active_device())
  with check (public.has_active_device());

revoke all on table public.chat_categories from public, anon;
revoke all on table public.chat_category_assignments from public, anon;
revoke all on table public.chat_presence from public, anon;

grant select, insert, update, delete on table public.chat_categories to authenticated;
grant select, insert, update, delete on table public.chat_category_assignments to authenticated;
grant select, insert, update on table public.chat_presence to authenticated;

create or replace function public.security_pin_status()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(security_pin_hash, '') <> ''
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.configure_security_pin(p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
begin
  if auth.uid() is null then
    raise exception 'Tu sesión no es válida.';
  end if;

  if p_pin is null or p_pin !~ '^[0-9]{4,8}$' then
    raise exception 'El PIN debe tener entre 4 y 8 dígitos.';
  end if;

  select security_pin_hash into v_hash
  from public.profiles
  where id = auth.uid()
  for update;

  if coalesce(v_hash, '') <> '' then
    raise exception 'Ya tienes un PIN. Usa el cambio de PIN.';
  end if;

  update public.profiles
  set security_pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf')),
      pin_failed_attempts = 0,
      pin_locked_until = null
  where id = auth.uid();

  return true;
end;
$$;

create or replace function public.verify_security_pin(p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_attempts integer;
  v_locked timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Tu sesión no es válida.';
  end if;

  select security_pin_hash, pin_failed_attempts, pin_locked_until
    into v_hash, v_attempts, v_locked
  from public.profiles
  where id = auth.uid()
  for update;

  if coalesce(v_hash, '') = '' then
    raise exception 'Aún no configuras un PIN de seguridad.';
  end if;

  if v_locked is not null and v_locked > now() then
    raise exception 'PIN bloqueado temporalmente. Inténtalo de nuevo en unos minutos.';
  end if;

  if v_hash = extensions.crypt(p_pin, v_hash) then
    update public.profiles
    set pin_failed_attempts = 0,
        pin_locked_until = null
    where id = auth.uid();
    return true;
  end if;

  v_attempts := coalesce(v_attempts, 0) + 1;

  update public.profiles
  set pin_failed_attempts = v_attempts,
      pin_locked_until = case
        when v_attempts >= 5 then now() + interval '5 minutes'
        else null
      end
  where id = auth.uid();

  return false;
end;
$$;

create or replace function public.verify_security_pin_password(p_password text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
begin
  if auth.uid() is null then
    raise exception 'Tu sesión no es válida.';
  end if;

  if coalesce(p_password, '') = '' then
    return false;
  end if;

  select encrypted_password into v_hash
  from auth.users
  where id = auth.uid();

  if v_hash is null then
    return false;
  end if;

  return v_hash = extensions.crypt(p_password, v_hash);
end;
$$;

create or replace function public.replace_security_pin(p_password text, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if auth.uid() is null then
    raise exception 'Tu sesión no es válida.';
  end if;

  if not public.verify_security_pin_password(p_password) then
    raise exception 'La contraseña no es correcta.';
  end if;

  if p_pin is null or p_pin !~ '^[0-9]{4,8}$' then
    raise exception 'El PIN debe tener entre 4 y 8 dígitos.';
  end if;

  update public.profiles
  set security_pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf')),
      pin_failed_attempts = 0,
      pin_locked_until = null
  where id = auth.uid();

  return true;
end;
$$;

create or replace function public.chat_set_pin_protection(p_conversation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  if auth.uid() is null then
    raise exception 'Tu sesión no es válida.';
  end if;

  if not public.is_conversation_member(p_conversation_id) then
    raise exception 'No perteneces a esa conversación.';
  end if;

  update public.conversation_members
  set pin_hash = 'protected'
  where conversation_id = p_conversation_id
    and user_id = auth.uid()
    and status = 'active';

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'No encontramos tu participación en ese chat.';
  end if;

  return true;
end;
$$;

create or replace function public.chat_remove_pin_protection(
  p_conversation_id uuid,
  p_pin text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Tu sesión no es válida.';
  end if;

  if not public.verify_security_pin(p_pin) then
    raise exception 'PIN incorrecto.';
  end if;

  if not public.is_conversation_member(p_conversation_id) then
    raise exception 'No perteneces a esa conversación.';
  end if;

  update public.conversation_members
  set pin_hash = null
  where conversation_id = p_conversation_id
    and user_id = auth.uid()
    and status = 'active';

  return false;
end;
$$;

create or replace function public.chat_presence_snapshot(
  p_viewer uuid,
  p_targets uuid[]
)
returns table (
  identity_id uuid,
  is_online boolean,
  expires_at timestamptz,
  last_seen_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    target_id as identity_id,
    coalesce(presence.online, false)
      and presence.expires_at is not null
      and presence.expires_at > now() as is_online,
    presence.expires_at,
    presence.updated_at as last_seen_at
  from unnest(coalesce(p_targets, array[]::uuid[])) as target_id
  left join public.chat_presence as presence
    on presence.user_id = target_id
  where auth.uid() is not null
    and (
      target_id = auth.uid()
      or exists (
        select 1
        from public.conversation_members as mine
        join public.conversation_members as theirs
          on theirs.conversation_id = mine.conversation_id
        where mine.user_id = auth.uid()
          and mine.status = 'active'
          and theirs.user_id = target_id
          and theirs.status = 'active'
      )
    )
  limit 100;
$$;

revoke all on function public.security_pin_status() from public, anon;
revoke all on function public.configure_security_pin(text) from public, anon;
revoke all on function public.verify_security_pin(text) from public, anon;
revoke all on function public.verify_security_pin_password(text) from public, anon;
revoke all on function public.replace_security_pin(text, text) from public, anon;
revoke all on function public.chat_set_pin_protection(uuid) from public, anon;
revoke all on function public.chat_remove_pin_protection(uuid, text) from public, anon;
revoke all on function public.chat_presence_snapshot(uuid, uuid[]) from public, anon;

grant execute on function public.security_pin_status() to authenticated;
grant execute on function public.configure_security_pin(text) to authenticated;
grant execute on function public.verify_security_pin(text) to authenticated;
grant execute on function public.verify_security_pin_password(text) to authenticated;
grant execute on function public.replace_security_pin(text, text) to authenticated;
grant execute on function public.chat_set_pin_protection(uuid) to authenticated;
grant execute on function public.chat_remove_pin_protection(uuid, text) to authenticated;
grant execute on function public.chat_presence_snapshot(uuid, uuid[]) to authenticated;
