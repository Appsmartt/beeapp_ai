-- La visibilidad de la red controla si otros usuarios pueden encontrar
-- el perfil por nombre, profesión, empresa o categoría.

create or replace function public.set_network_visibility(p_visibility text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_value text := lower(btrim(coalesce(p_visibility, '')));
  v_public boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if v_value in ('public', 'publico') then
    v_value := 'publico';
    v_public := true;
  elsif v_value in ('private', 'privado', 'contacts') then
    v_value := 'privado';
    v_public := false;
  elsif v_value in ('team', 'solo_equipo') then
    v_value := 'solo_equipo';
    v_public := false;
  else
    raise exception 'Invalid visibility';
  end if;

  update public.profiles
  set network_visibility = v_value,
      is_public = v_public,
      updated_at = now()
  where id = auth.uid();
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
    profile.id,
    profile.first_name,
    profile.last_name,
    trim(profile.first_name || ' ' || profile.last_name),
    profile.email,
    profile.phone_dial_code,
    profile.phone_number,
    profile.normalized_phone
  from public.profiles as profile
  where profile.id <> auth.uid()
    and coalesce(profile.is_public, false)
    and lower(btrim(coalesce(profile.network_visibility, 'publico')))
      in ('public', 'publico')
    and (
      coalesce(p_query, '') = ''
      or profile.first_name ilike '%' || p_query || '%'
      or profile.last_name ilike '%' || p_query || '%'
      or profile.email ilike '%' || p_query || '%'
      or coalesce(profile.normalized_phone, '') ilike '%' || p_query || '%'
      or coalesce(profile.occupation, '') ilike '%' || p_query || '%'
      or exists (
        select 1
        from public.businesses as business
        left join public.categories as category
          on category.id = business.category_id
          or category.id = any(coalesce(business.category_ids, '{}'::uuid[]))
        where business.owner_id = profile.id
          and business.archived_at is null
          and business.is_public = true
          and business.publication_status = 'published'
          and (
            business.display_name ilike '%' || p_query || '%'
            or coalesce(business.custom_activity_text, '') ilike '%' || p_query || '%'
            or coalesce(business.description, '') ilike '%' || p_query || '%'
            or coalesce(category.name, '') ilike '%' || p_query || '%'
          )
      )
    )
  order by profile.first_name, profile.last_name
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
    'id', profile.id,
    'display_name', trim(profile.first_name || ' ' || profile.last_name),
    'occupation', coalesce(profile.occupation, '')
  )), '[]'::jsonb)
  from (
    select *
    from public.profiles as candidate
    where candidate.id <> auth.uid()
      and coalesce(candidate.is_public, false)
      and lower(btrim(coalesce(candidate.network_visibility, 'publico')))
        in ('public', 'publico')
      and (
        coalesce(p_search, '') = ''
        or candidate.first_name ilike '%' || p_search || '%'
        or candidate.last_name ilike '%' || p_search || '%'
        or coalesce(candidate.occupation, '') ilike '%' || p_search || '%'
        or exists (
          select 1
          from public.businesses as business
          left join public.categories as category
            on category.id = business.category_id
            or category.id = any(coalesce(business.category_ids, '{}'::uuid[]))
          where business.owner_id = candidate.id
            and business.archived_at is null
            and business.is_public = true
            and business.publication_status = 'published'
            and (
              business.display_name ilike '%' || p_search || '%'
              or coalesce(business.custom_activity_text, '') ilike '%' || p_search || '%'
              or coalesce(business.description, '') ilike '%' || p_search || '%'
              or coalesce(category.name, '') ilike '%' || p_search || '%'
            )
        )
      )
    order by candidate.first_name
    limit 30
  ) as profile;
$$;
