-- Validación de disponibilidad pública por horario configurado del negocio.

create or replace function public.is_business_open_now(
  p_hours jsonb,
  p_timezone text default 'America/Bogota',
  p_is_available boolean default true
)
returns boolean
language plpgsql
stable
security invoker
set search_path = public
as $function$
declare
  v_tz text := coalesce(nullif(btrim(p_timezone), ''), 'America/Bogota');
  v_local timestamp;
  v_dow integer;
  v_time text;
begin
  if coalesce(p_is_available, true) is not true then
    return false;
  end if;

  if p_hours is null or jsonb_typeof(p_hours) <> 'array' or jsonb_array_length(p_hours) = 0 then
    return false;
  end if;

  begin
    v_local := now() at time zone v_tz;
  exception when others then
    v_local := now() at time zone 'America/Bogota';
  end;

  v_dow := extract(dow from v_local)::integer;
  v_time := to_char(v_local, 'HH24:MI');

  return exists (
    select 1
    from jsonb_array_elements(p_hours) as item
    where (item->>'day_of_week') ~ '^[0-6]$'
      and (item->>'day_of_week')::integer = v_dow
      and coalesce((item->>'is_closed')::boolean, false) = false
      and left(btrim(coalesce(item->>'opens_at', '')), 5) ~ '^\d{2}:\d{2}$'
      and left(btrim(coalesce(item->>'closes_at', '')), 5) ~ '^\d{2}:\d{2}$'
      and left(btrim(coalesce(item->>'opens_at', '')), 5) < left(btrim(coalesce(item->>'closes_at', '')), 5)
      and v_time >= left(btrim(coalesce(item->>'opens_at', '')), 5)
      and v_time <= left(btrim(coalesce(item->>'closes_at', '')), 5)
  );
end;
$function$;

revoke all on function public.is_business_open_now(jsonb, text, boolean) from public, anon;
grant execute on function public.is_business_open_now(jsonb, text, boolean) to authenticated;

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
        and business.is_available = true
        and business.publication_status = 'published'
        and business.archived_at is null
        and public.is_business_open_now(business.hours, business.timezone, business.is_available) = true
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

