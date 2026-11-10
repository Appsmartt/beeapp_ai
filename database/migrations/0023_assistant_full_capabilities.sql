-- Amplía capacidades del asistente IA:
-- 1. Columna archived en conversation_members para persistir chats archivados.
-- 2. Política de lectura propia en activity_log.
-- 3. Función RPC search_marketplace_providers_filtered con soporte para filtros de ciudad, tipo de oferta, modalidad y horario.

alter table public.conversation_members
  add column if not exists archived boolean not null default false;

do $$
begin
  create policy activity_own_read
    on public.activity_log
    for select
    to authenticated
    using (
      actor_id = (select auth.uid())
      or public.is_admin()
    );
exception
  when duplicate_object then null;
end $$;

create or replace function public.search_marketplace_providers_filtered(
  p_query text default '',
  p_city text default '',
  p_offer_type text default '',
  p_modality text default '',
  p_only_open boolean default false,
  p_limit integer default 10
)
returns jsonb
language plpgsql
stable
security definer
set search_path to public
as $function$
declare
  v_user uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 10), 1), 25);
  v_query text := replace(replace(left(btrim(coalesce(p_query, '')), 120), '%', ''), '_', ' ');
  v_city text := replace(replace(left(btrim(coalesce(p_city, '')), 80), '%', ''), '_', ' ');
  v_offer_type text := lower(btrim(coalesce(p_offer_type, '')));
  v_modality text := lower(btrim(coalesce(p_modality, '')));
  v_profile_city text;
begin
  if v_user is null then
    raise exception 'No autorizado';
  end if;

  select nullif(btrim(location), '')
    into v_profile_city
  from public.profiles
  where id = v_user;

  return coalesce((
    select jsonb_agg(to_jsonb(provider_match) order by provider_match.match_rank, provider_match.business_name, provider_match.title)
    from (
      select
        offer.id as offer_id,
        offer.title,
        offer.offer_kind,
        offer.pricing_strategy,
        offer.base_price_amount,
        offer.currency_code,
        offer.modalities as offer_modalities,
        offer.requires_booking,
        offer.duration_minutes,
        left(coalesce(offer.description, ''), 280) as description,
        business.id as business_id,
        business.display_name as business_name,
        business.offer_type as business_offer_type,
        left(coalesce(business.description, ''), 240) as business_description,
        business.city,
        business.country_code,
        business.address,
        business.neighborhood,
        business.modalities as business_modalities,
        business.timezone,
        business.hours,
        public.is_business_open_now(business.hours, business.timezone, business.is_available) as is_open_now,
        category.name as category_name,
        case
          when v_city <> '' and coalesce(business.city, '') ilike '%' || v_city || '%' then 0
          when v_city = '' and v_profile_city is not null and coalesce(business.city, '') ilike '%' || v_profile_city || '%' then 0
          else 1
        end
        + case
          when public.is_business_open_now(business.hours, business.timezone, business.is_available) then 0
          else 1
        end
        + case
          when v_query = '' then 0
          when offer.title ilike '%' || v_query || '%' then 0
          when coalesce(category.name, '') ilike '%' || v_query || '%' then 0
          when business.display_name ilike '%' || v_query || '%' then 1
          when coalesce(business.description, '') ilike '%' || v_query || '%' then 1
          else 2
        end as match_rank
      from public.businesses as business
      left join public.categories as category
        on category.id = business.category_id
      left join public.offers as offer
        on offer.business_id = business.id
       and offer.archived_at is null
       and offer.is_available = true
       and offer.status in ('published', 'active')
      where business.is_public = true
        and business.publication_status = 'published'
        and business.archived_at is null
        and (
          not coalesce(p_only_open, false)
          or public.is_business_open_now(business.hours, business.timezone, business.is_available)
        )
        and (
          v_city = ''
          or coalesce(business.city, '') ilike '%' || v_city || '%'
          or coalesce(business.neighborhood, '') ilike '%' || v_city || '%'
          or coalesce(business.address, '') ilike '%' || v_city || '%'
        )
        and (
          v_offer_type = ''
          or lower(coalesce(business.offer_type, '')) = v_offer_type
          or (v_offer_type = 'products' and lower(coalesce(offer.offer_kind, '')) = 'product')
          or (v_offer_type = 'services' and lower(coalesce(offer.offer_kind, '')) = 'service')
        )
        and (
          v_modality = ''
          or v_modality = any(coalesce(business.modalities, '{}'::text[]))
          or v_modality = any(coalesce(offer.modalities, '{}'::text[]))
        )
        and (
          v_query = ''
          or coalesce(offer.title, '') ilike '%' || v_query || '%'
          or coalesce(offer.description, '') ilike '%' || v_query || '%'
          or coalesce(category.name, '') ilike '%' || v_query || '%'
          or business.display_name ilike '%' || v_query || '%'
          or coalesce(business.description, '') ilike '%' || v_query || '%'
          or coalesce(business.custom_activity_text, '') ilike '%' || v_query || '%'
          or coalesce(business.city, '') ilike '%' || v_query || '%'
        )
      order by match_rank, business.display_name, offer.title
      limit v_limit
    ) as provider_match
  ), '[]'::jsonb);
end;
$function$;

revoke all on function public.search_marketplace_providers_filtered(text, text, text, text, boolean, integer) from public, anon;
grant execute on function public.search_marketplace_providers_filtered(text, text, text, text, boolean, integer) to authenticated, service_role;
