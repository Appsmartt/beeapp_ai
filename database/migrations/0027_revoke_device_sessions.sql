create or replace function public.revoke_auth_session(p_session uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if p_session is null then
    return;
  end if;

  delete from auth.refresh_tokens
  where session_id = p_session;

  delete from auth.sessions
  where id = p_session;
end;
$$;

create or replace function public.revoke_device_session(p_device_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_session uuid;
begin
  if v_user is null then
    raise exception 'No autorizado.';
  end if;

  select auth_session_id
  into v_session
  from public.devices
  where id = p_device_id
    and user_id = v_user;

  if not found then
    raise exception 'No encontramos ese dispositivo.';
  end if;

  update public.devices
  set is_active = false,
      revoked_at = now()
  where id = p_device_id
    and user_id = v_user;

  perform public.revoke_auth_session(v_session);
end;
$$;

create or replace function public.revoke_device_sessions(p_include_current boolean default false)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_current uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  rec record;
begin
  if v_user is null then
    raise exception 'No autorizado.';
  end if;

  for rec in
    select id, auth_session_id
    from public.devices
    where user_id = v_user
      and is_active
      and (
        coalesce(p_include_current, false)
        or auth_session_id is distinct from v_current
      )
  loop
    update public.devices
    set is_active = false,
        revoked_at = now()
    where id = rec.id;

    perform public.revoke_auth_session(rec.auth_session_id);
  end loop;
end;
$$;

create or replace function public.register_device_session(
  p_device_name text,
  p_platform text default 'android',
  p_device_type text default 'MOBILE',
  p_user_agent text default null
) returns uuid
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_user uuid := auth.uid();
  v_session uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  v_type text := upper(coalesce(nullif(p_device_type, ''), 'MOBILE'));
  v_hash text;
  v_id uuid;
  v_revoked timestamptz;
  rec record;
begin
  if v_user is null or v_session is null then
    raise exception 'Sesión no válida';
  end if;
  if v_type not in ('WEB', 'MOBILE', 'DESKTOP') then
    v_type := 'MOBILE';
  end if;

  select revoked_at
  into v_revoked
  from public.devices
  where user_id = v_user
    and auth_session_id = v_session
  limit 1;

  if found and v_revoked is not null then
    raise exception 'Esta sesión fue cerrada';
  end if;

  -- La web conserva la sesión hasta que la persona cierra sesión.
  -- En móvil se mantiene un solo dispositivo activo de ese tipo.
  if v_type <> 'WEB' then
    for rec in
      select id, auth_session_id
      from public.devices
      where user_id = v_user
        and device_type = v_type
        and is_active
        and auth_session_id is distinct from v_session
    loop
      update public.devices
      set is_active = false,
          revoked_at = now()
      where id = rec.id;

      perform public.revoke_auth_session(rec.auth_session_id);
    end loop;
  end if;

  v_hash := encode(extensions.digest(v_session::text || v_user::text, 'sha256'), 'hex');

  insert into public.devices (
    user_id, device_name, device_type, platform, user_agent,
    session_token_hash, auth_session_id, is_active, last_seen_at, expires_at
  ) values (
    v_user,
    coalesce(nullif(p_device_name, ''), 'Buddy AI'),
    v_type,
    coalesce(nullif(p_platform, ''), 'android'),
    p_user_agent,
    v_hash,
    v_session,
    true,
    now(),
    now() + case when v_type = 'WEB' then interval '10 years' else interval '30 days' end
  )
  on conflict (user_id, auth_session_id) where auth_session_id is not null
  do update set
    is_active = true,
    revoked_at = null,
    last_seen_at = now(),
    expires_at = now() + case when v_type = 'WEB' then interval '10 years' else interval '30 days' end,
    device_name = excluded.device_name,
    platform = excluded.platform,
    user_agent = excluded.user_agent
  where public.devices.revoked_at is null
  returning id into v_id;

  if v_id is null then
    raise exception 'Esta sesión fue cerrada';
  end if;

  return v_id;
end;
$$;

revoke all on function public.revoke_auth_session(uuid) from public, anon, authenticated;
grant execute on function public.revoke_auth_session(uuid) to service_role;
grant execute on function public.revoke_device_session(uuid) to authenticated, service_role;
grant execute on function public.revoke_device_sessions(boolean) to authenticated, service_role;
grant execute on function public.register_device_session(text, text, text, text) to authenticated, service_role;
