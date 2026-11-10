-- Métricas de ventas completadas de un negocio.
-- La fecha de la venta es el momento en que pasó a completed.

create or replace function public.order_sale_at(
  p_history jsonb,
  p_updated_at timestamptz
)
returns timestamptz
language sql
stable
as $$
  select coalesce(
    (
      select min((event->>'at')::timestamptz)
      from jsonb_array_elements(
        case
          when jsonb_typeof(coalesce(p_history, '[]'::jsonb)) = 'array'
            then coalesce(p_history, '[]'::jsonb)
          else '[]'::jsonb
        end
      ) as event
      where event->>'action' = 'complete'
        and coalesce(event->>'at', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[T ][0-9]{2}:[0-9]{2}'
    ),
    p_updated_at
  );
$$;

revoke all on function public.order_sale_at(jsonb, timestamptz) from public, anon;

create or replace function public.get_business_sales_metrics(
  p_business_id uuid,
  p_grain text,
  p_anchor date default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_owner uuid;
  v_tz text;
  v_grain text := lower(btrim(coalesce(p_grain, '')));
  v_anchor date;
  v_start date;
  v_end date;
  v_label text;
  v_currency text := 'COP';
  v_sales_count integer := 0;
  v_amount bigint := 0;
  v_buckets jsonb := '[]'::jsonb;
  v_top jsonb := '[]'::jsonb;
  v_months text[] := array[
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  v_short text[] := array[
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
  ];
begin
  if v_user is null or not public.has_active_device() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if v_grain not in ('day', 'week', 'month') then
    raise exception 'El periodo debe ser día, semana o mes.' using errcode = '22023';
  end if;

  select
    owner_id,
    coalesce(nullif(btrim(timezone), ''), 'America/Bogota')
  into v_owner, v_tz
  from public.businesses
  where id = p_business_id;

  if v_owner is null then
    raise exception 'No encontramos el negocio' using errcode = 'P0002';
  end if;

  if v_owner <> v_user and not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  begin
    perform now() at time zone v_tz;
  exception
    when others then
      v_tz := 'America/Bogota';
  end;

  v_anchor := coalesce(p_anchor, (now() at time zone v_tz)::date);

  if v_grain = 'day' then
    v_start := v_anchor;
    v_end := v_anchor;
    v_label := extract(day from v_start)::integer::text
      || ' de ' || v_months[extract(month from v_start)::integer]
      || ' de ' || extract(year from v_start)::integer::text;
  elsif v_grain = 'week' then
    v_start := date_trunc('week', v_anchor::timestamp)::date;
    v_end := v_start + 6;
    if extract(month from v_start) = extract(month from v_end)
      and extract(year from v_start) = extract(year from v_end) then
      v_label := extract(day from v_start)::integer::text
        || '–' || extract(day from v_end)::integer::text
        || ' ' || v_short[extract(month from v_start)::integer]
        || ' ' || extract(year from v_start)::integer::text;
    else
      v_label := extract(day from v_start)::integer::text
        || ' ' || v_short[extract(month from v_start)::integer]
        || ' – ' || extract(day from v_end)::integer::text
        || ' ' || v_short[extract(month from v_end)::integer]
        || ' ' || extract(year from v_end)::integer::text;
    end if;
  else
    v_start := date_trunc('month', v_anchor::timestamp)::date;
    v_end := (v_start + interval '1 month' - interval '1 day')::date;
    v_label := v_months[extract(month from v_start)::integer]
      || ' ' || extract(year from v_start)::integer::text;
  end if;

  select grouped.currency_code
  into v_currency
  from (
    select
      coalesce(nullif(btrim(o.currency_code), ''), 'COP') as currency_code,
      count(*) as sales_count
    from public.orders as o
    where o.business_id = p_business_id
      and o.status = 'completed'
      and (public.order_sale_at(o.history, o.updated_at) at time zone v_tz)::date
        between v_start and v_end
    group by 1
    order by sales_count desc, currency_code
    limit 1
  ) as grouped;

  if v_currency is null or btrim(v_currency) = '' then
    v_currency := 'COP';
  end if;

  select
    count(*)::integer,
    coalesce(sum(o.total_amount), 0)::bigint
  into v_sales_count, v_amount
  from public.orders as o
  where o.business_id = p_business_id
    and o.status = 'completed'
    and coalesce(nullif(btrim(o.currency_code), ''), 'COP') = v_currency
    and (public.order_sale_at(o.history, o.updated_at) at time zone v_tz)::date
      between v_start and v_end;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'date', to_char(day_row.sale_day, 'YYYY-MM-DD'),
      'sales_count', coalesce(day_sales.sales_count, 0),
      'amount', coalesce(day_sales.amount, 0)
    )
    order by day_row.sale_day
  ), '[]'::jsonb)
  into v_buckets
  from generate_series(v_start, v_end, interval '1 day') as day_row(sale_day)
  left join (
    select
      (public.order_sale_at(o.history, o.updated_at) at time zone v_tz)::date as sale_day,
      count(*)::integer as sales_count,
      coalesce(sum(o.total_amount), 0)::bigint as amount
    from public.orders as o
    where o.business_id = p_business_id
      and o.status = 'completed'
      and coalesce(nullif(btrim(o.currency_code), ''), 'COP') = v_currency
      and (public.order_sale_at(o.history, o.updated_at) at time zone v_tz)::date
        between v_start and v_end
    group by 1
  ) as day_sales
    on day_sales.sale_day = day_row.sale_day::date;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', ranked.offer_id,
      'title', ranked.title,
      'offer_kind', ranked.offer_kind,
      'units', ranked.units,
      'amount', ranked.amount
    )
    order by ranked.units desc, ranked.amount desc, ranked.title
  ), '[]'::jsonb)
  into v_top
  from (
    select
      max(nullif(btrim(coalesce(
        item->>'commercial_offer_id',
        item->>'offer_id'
      )), '')) as offer_id,
      max(coalesce(nullif(btrim(item->>'title'), ''), 'Oferta')) as title,
      max(coalesce(nullif(btrim(item->>'offer_kind'), ''), 'product')) as offer_kind,
      sum(
        case
          when coalesce(item->>'quantity', '') ~ '^[0-9]+(\.[0-9]+)?$'
            then (item->>'quantity')::numeric
          else 1
        end
      ) as units,
      round(sum(
        case
          when coalesce(item->>'line_total_amount', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
            then (item->>'line_total_amount')::numeric
          else 0
        end
      ))::bigint as amount
    from public.orders as o
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(coalesce(o.items, '[]'::jsonb)) = 'array'
          then coalesce(o.items, '[]'::jsonb)
        else '[]'::jsonb
      end
    ) as item
    where o.business_id = p_business_id
      and o.status = 'completed'
      and coalesce(nullif(btrim(o.currency_code), ''), 'COP') = v_currency
      and (public.order_sale_at(o.history, o.updated_at) at time zone v_tz)::date
        between v_start and v_end
    group by coalesce(
      nullif(btrim(item->>'commercial_offer_id'), ''),
      nullif(btrim(item->>'offer_id'), ''),
      'title:' || lower(coalesce(nullif(btrim(item->>'title'), ''), 'oferta'))
    )
    order by units desc, amount desc, title
    limit 50
  ) as ranked;

  return jsonb_build_object(
    'period', jsonb_build_object(
      'grain', v_grain,
      'anchor', to_char(v_anchor, 'YYYY-MM-DD'),
      'start', to_char(v_start, 'YYYY-MM-DD'),
      'end', to_char(v_end, 'YYYY-MM-DD'),
      'timezone', v_tz,
      'label', v_label
    ),
    'totals', jsonb_build_object(
      'sales_count', v_sales_count,
      'amount', v_amount,
      'currency_code', v_currency
    ),
    'buckets', v_buckets,
    'top_offers', v_top
  );
end;
$$;

revoke all on function public.get_business_sales_metrics(uuid, text, date) from public, anon;
grant execute on function public.get_business_sales_metrics(uuid, text, date) to authenticated, service_role;
