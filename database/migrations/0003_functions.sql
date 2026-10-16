-- RPC usadas por la app, la web y el admin. Argumentos de admin_* se mantienen.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  dial text := nullif(meta ->> 'phone_dial_code', '');
  phone text := nullif(meta ->> 'phone_number', '');
begin
  if (dial is null) <> (phone is null) then
    dial := null;
    phone := null;
  end if;

  insert into public.profiles (
    id, first_name, last_name, email, phone_dial_code, phone_number, role
  ) values (
    new.id,
    coalesce(meta ->> 'first_name', ''),
    coalesce(meta ->> 'last_name', ''),
    new.email,
    dial,
    phone,
    'USER'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.register_device_session(
  p_device_name text,
  p_platform text default 'android',
  p_device_type text default 'MOBILE',
  p_user_agent text default null
) returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_session uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  v_type text := upper(coalesce(nullif(p_device_type, ''), 'MOBILE'));
  v_hash text;
  v_id uuid;
begin
  if v_user is null or v_session is null then
    raise exception 'Sesión no válida';
  end if;
  if v_type not in ('WEB', 'MOBILE', 'DESKTOP') then
    v_type := 'MOBILE';
  end if;

  v_hash := encode(extensions.digest(v_session::text || v_user::text, 'sha256'), 'hex');

  update public.devices
  set is_active = false, revoked_at = now()
  where user_id = v_user
    and device_type = v_type
    and is_active
    and auth_session_id is distinct from v_session;

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
    now() + interval '30 days'
  )
  on conflict (user_id, auth_session_id) where auth_session_id is not null
  do update set
    is_active = true,
    revoked_at = null,
    last_seen_at = now(),
    expires_at = now() + interval '30 days',
    device_name = excluded.device_name,
    platform = excluded.platform,
    user_agent = excluded.user_agent
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.search_beeapp_users_for_invitation(
  p_query text,
  p_limit integer default 10
) returns table (
  user_id uuid,
  first_name text,
  last_name text,
  display_name text,
  email text,
  phone_dial_code text,
  phone_number text,
  normalized_phone text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.first_name,
    p.last_name,
    trim(p.first_name || ' ' || p.last_name),
    p.email,
    p.phone_dial_code,
    p.phone_number,
    p.normalized_phone
  from public.profiles p
  where p.id <> auth.uid()
    and (
      coalesce(p_query, '') = ''
      or p.first_name ilike '%' || p_query || '%'
      or p.last_name ilike '%' || p_query || '%'
      or p.email ilike '%' || p_query || '%'
      or p.normalized_phone ilike '%' || p_query || '%'
    )
  order by p.first_name, p.last_name
  limit least(coalesce(p_limit, 10), 50);
$$;

create or replace function public.discover_network_profiles(p_search text default '')
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'display_name', trim(p.first_name || ' ' || p.last_name),
    'occupation', coalesce(p.occupation, '')
  )), '[]'::jsonb)
  from (
    select *
    from public.profiles
    where is_public
      and id <> auth.uid()
      and (
        coalesce(p_search, '') = ''
        or first_name ilike '%' || p_search || '%'
        or last_name ilike '%' || p_search || '%'
        or occupation ilike '%' || p_search || '%'
      )
    order by first_name
    limit 30
  ) p;
$$;

create or replace function public.create_direct_chat(p_recipient_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null or p_recipient_id is null or p_recipient_id = v_user then
    raise exception 'Destinatario no válido';
  end if;

  select c.id into v_id
  from public.conversations c
  where c.kind = 'direct'
    and exists (
      select 1 from public.conversation_members m
      where m.conversation_id = c.id and m.user_id = v_user and m.status = 'active'
    )
    and exists (
      select 1 from public.conversation_members m
      where m.conversation_id = c.id and m.user_id = p_recipient_id and m.status = 'active'
    )
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  insert into public.conversations (kind, owner_id)
  values ('direct', v_user)
  returning id into v_id;

  insert into public.conversation_members (conversation_id, user_id, role, status)
  values
    (v_id, v_user, 'owner', 'active'),
    (v_id, p_recipient_id, 'member', 'active');

  return v_id;
end;
$$;

create or replace function public.get_chat_inbox(p_limit integer default 50)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb)
  from (
    select
      c.id as conversation_id,
      c.kind as conversation_type,
      c.name as group_name,
      c.description as group_description,
      c.image_file_id as group_image_file_id,
      other_user.id as other_profile_id,
      null::uuid as other_commercial_profile_id,
      case
        when c.kind = 'direct' then trim(coalesce(other_user.first_name, '') || ' ' || coalesce(other_user.last_name, ''))
        else coalesce(c.name, 'Conversación')
      end as other_display_name,
      case when c.kind = 'direct' then other_user.avatar_file_id else c.image_file_id end as other_logo_file_id,
      last_msg.id as last_message_id,
      last_msg.kind as last_message_type,
      coalesce(last_msg.body, '') as last_message_preview,
      last_msg.created_at as last_message_at,
      last_msg.sender_id as last_message_sender_identity_id,
      (
        select count(*)::int
        from public.messages unread
        where unread.conversation_id = c.id
          and unread.seq > me.last_read_seq
          and unread.sender_id is distinct from auth.uid()
          and unread.deleted_at is null
      ) as unread_count,
      me.last_read_at,
      not me.muted as notifications_enabled,
      me.pinned,
      me.category
    from public.conversation_members me
    join public.conversations c on c.id = me.conversation_id
    left join lateral (
      select m.*
      from public.messages m
      where m.conversation_id = c.id and m.deleted_at is null
      order by m.seq desc
      limit 1
    ) last_msg on true
    left join lateral (
      select p.*
      from public.conversation_members om
      join public.profiles p on p.id = om.user_id
      where om.conversation_id = c.id
        and om.user_id is distinct from auth.uid()
        and om.status = 'active'
      limit 1
    ) other_user on true
    where me.user_id = auth.uid()
      and me.status = 'active'
    order by last_msg.created_at desc nulls last
    limit least(coalesce(p_limit, 50), 100)
  ) x;
$$;

create or replace function public.list_my_call_logs(p_limit integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb)
  from (
    select
      c.id,
      coalesce(
        nullif(trim(coalesce(other_user.first_name, '') || ' ' || coalesce(other_user.last_name, '')), ''),
        'Llamada'
      ) as display_name,
      case
        when c.status in ('missed', 'declined') and c.started_by is distinct from auth.uid() then 'missed'
        when c.started_by = auth.uid() then 'outgoing'
        else 'incoming'
      end as direction,
      c.kind as call_type,
      c.started_at as created_at,
      c.started_at,
      c.ended_at
    from public.calls c
    left join lateral (
      select p.first_name, p.last_name
      from public.conversation_members m
      join public.profiles p on p.id = m.user_id
      where m.conversation_id = c.conversation_id
        and m.user_id is distinct from auth.uid()
      limit 1
    ) other_user on true
    where c.started_by = auth.uid()
      or public.is_conversation_member(c.conversation_id)
    order by c.started_at desc
    limit least(coalesce(p_limit, 30), 100)
  ) x;
$$;

create or replace function public.commerce_public_countries()
returns table (country_code text, business_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select b.country_code, count(*)::bigint
  from public.businesses b
  where b.is_public
    and b.publication_status = 'published'
    and b.archived_at is null
    and b.country_code is not null
  group by b.country_code
  order by b.country_code;
$$;

create or replace function public.commerce_public_cities(p_country_code text)
returns table (country_code text, city text, business_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select b.country_code, b.city, count(*)::bigint
  from public.businesses b
  where b.is_public
    and b.publication_status = 'published'
    and b.archived_at is null
    and b.country_code = p_country_code
    and b.city is not null
  group by b.country_code, b.city
  order by b.city;
$$;

create or replace function public.commerce_public_popular_categories(
  p_country_code text default null,
  p_city text default null,
  p_limit integer default 12
)
returns table (
  category_id uuid,
  category_name text,
  category_slug text,
  offer_type text,
  business_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.name, c.slug, c.offer_type, count(b.id)::bigint
  from public.categories c
  join public.businesses b on b.category_id = c.id
  where b.is_public
    and b.publication_status = 'published'
    and b.archived_at is null
    and (p_country_code is null or b.country_code = p_country_code)
    and (p_city is null or b.city = p_city)
  group by c.id, c.name, c.slug, c.offer_type
  order by count(b.id) desc, c.name
  limit least(coalesce(p_limit, 12), 50);
$$;

create or replace function public.commerce_list_requests(
  p_scope text default 'customer',
  p_statuses text[] default '{}',
  p_limit integer default 50,
  p_offset integer default 0
) returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb)
  from (
    select
      o.id,
      o.customer_id as client_id,
      o.business_id as commercial_profile_id,
      o.status,
      o.total_amount,
      o.currency_code,
      o.items,
      o.created_at,
      o.updated_at,
      jsonb_array_length(o.items) as item_count
    from public.orders o
    where (
      (p_scope = 'business' and public.owns_business(o.business_id))
      or (p_scope is distinct from 'business' and o.customer_id = auth.uid())
    )
    and (
      coalesce(array_length(p_statuses, 1), 0) = 0
      or o.status = any (p_statuses)
    )
    order by o.created_at desc
    limit least(coalesce(p_limit, 50), 100)
    offset greatest(coalesce(p_offset, 0), 0)
  ) x;
$$;

create or replace function public.prepare_storage_upload(
  p_user_id uuid,
  p_original_name text,
  p_mime_type text,
  p_size_bytes bigint,
  p_folder_id uuid default null,
  p_bucket_id text default 'beeapp-files'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_bucket text := coalesce(nullif(p_bucket_id, ''), 'beeapp-files');
  v_path text;
begin
  if v_user is null or (p_user_id is not null and p_user_id <> v_user and not public.is_admin()) then
    raise exception 'No autorizado';
  end if;
  if v_bucket not in ('beeapp-files', 'beeapp-statuses', 'beeapp-commercial-images') then
    raise exception 'Bucket no permitido';
  end if;

  v_path := v_user::text || '/' || gen_random_uuid()::text || '/' || coalesce(p_original_name, 'archivo');

  insert into public.files (
    owner_id, kind, parent_id, name, bucket, path, mime_type, size_bytes, upload_status
  ) values (
    v_user, 'file', p_folder_id, coalesce(p_original_name, 'archivo'),
    v_bucket, v_path, p_mime_type, coalesce(p_size_bytes, 0), 'pending'
  )
  returning id into v_id;

  return jsonb_build_object(
    'upload_id', v_id,
    'file_id', v_id,
    'storage_path', v_path,
    'bucket_id', v_bucket,
    'expires_at', now() + interval '1 hour'
  );
end;
$$;

create or replace function public.complete_storage_upload(
  p_user_id uuid,
  p_upload_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_size bigint;
begin
  if v_user is null or (p_user_id is not null and p_user_id <> v_user and not public.is_admin()) then
    raise exception 'No autorizado';
  end if;

  update public.files
  set upload_status = 'ready', updated_at = now()
  where id = p_upload_id and owner_id = v_user
  returning size_bytes into v_size;

  if v_size is null then
    raise exception 'Archivo no encontrado';
  end if;

  update public.profiles
  set storage_used_bytes = storage_used_bytes + v_size
  where id = v_user;

  return jsonb_build_object('file_id', p_upload_id, 'size_bytes', v_size, 'status', 'ready');
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;
grant execute on function public.register_device_session(text, text, text, text) to authenticated, service_role;
grant execute on function public.search_beeapp_users_for_invitation(text, integer) to authenticated, service_role;
grant execute on function public.discover_network_profiles(text) to authenticated, service_role;
grant execute on function public.create_direct_chat(uuid) to authenticated, service_role;
grant execute on function public.get_chat_inbox(integer) to authenticated, service_role;
grant execute on function public.list_my_call_logs(integer) to authenticated, service_role;
grant execute on function public.commerce_public_countries() to anon, authenticated, service_role;
grant execute on function public.commerce_public_cities(text) to anon, authenticated, service_role;
grant execute on function public.commerce_public_popular_categories(text, text, integer) to anon, authenticated, service_role;
grant execute on function public.commerce_list_requests(text, text[], integer, integer) to authenticated, service_role;
grant execute on function public.prepare_storage_upload(uuid, text, text, bigint, uuid, text) to authenticated, service_role;
grant execute on function public.complete_storage_upload(uuid, uuid) to authenticated, service_role;
