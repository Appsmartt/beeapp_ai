-- FOUND es una variable especial de plpgsql, así que el alias no puede llamarse found.

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
