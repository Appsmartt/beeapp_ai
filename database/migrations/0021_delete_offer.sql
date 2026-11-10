-- Eliminación segura de ofertas (productos y servicios): solo si nunca se usaron.
--
-- Una oferta "se usó" cuando aparece en compras/solicitudes/reservas (orders)
-- o cuando ha sido compartida o mencionada en mensajes de chat o estados.

-- Contadores de uso de la oferta.
create or replace function public.offer_usage(p_offer_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_orders int := 0;
  v_chats int := 0;
begin
  select business_id
    into v_business_id
  from public.offers
  where id = p_offer_id;

  if v_business_id is null then
    return jsonb_build_object('orders', 0, 'chats', 0);
  end if;

  select count(*)::int
    into v_orders
  from public.orders as o
  where o.business_id = v_business_id
    and (
      (
        jsonb_typeof(o.items) = 'array'
        and exists (
          select 1
          from jsonb_array_elements(o.items) as item
          where coalesce(
            item->>'commercial_offer_id',
            item->>'offer_id',
            item->'offer_snapshot'->>'id'
          ) = p_offer_id::text
        )
      )
      or coalesce(
        o.reservation->>'commercial_offer_id',
        o.reservation->>'offer_id'
      ) = p_offer_id::text
    );

  select count(distinct c.id)::int
    into v_chats
  from public.conversations as c
  join public.messages as m
    on m.conversation_id = c.id
  where c.business_id = v_business_id
    and m.deleted_at is null
    and (
      coalesce(m.body, '') ilike '%' || p_offer_id::text || '%'
      or coalesce(m.attachments::text, '') ilike '%' || p_offer_id::text || '%'
    );

  return jsonb_build_object(
    'orders', v_orders,
    'chats', v_chats
  );
end;
$$;

revoke all on function public.offer_usage(uuid) from public, anon;
grant execute on function public.offer_usage(uuid) to authenticated, service_role;

-- Estado de eliminación de una oferta para la app. Solo el dueño del negocio (o un admin) lo consulta.
create or replace function public.get_offer_delete_status(p_offer_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_usage jsonb;
begin
  select b.owner_id
    into v_owner
  from public.offers as o
  join public.businesses as b
    on b.id = o.business_id
  where o.id = p_offer_id;

  if v_owner is null then
    raise exception 'No encontramos el producto o servicio' using errcode = 'P0002';
  end if;

  if v_owner <> auth.uid() and not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  v_usage := public.offer_usage(p_offer_id);

  return v_usage || jsonb_build_object(
    'can_delete',
    (v_usage->>'orders')::int = 0 and (v_usage->>'chats')::int = 0
  );
end;
$$;

revoke all on function public.get_offer_delete_status(uuid) from public, anon;
grant execute on function public.get_offer_delete_status(uuid) to authenticated, service_role;

-- Eliminación atómica de una oferta.
create or replace function public.delete_offer(p_offer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_owner uuid;
  v_usage jsonb;
begin
  if v_user is null or not public.has_active_device() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select b.owner_id
    into v_owner
  from public.offers as o
  join public.businesses as b
    on b.id = o.business_id
  where o.id = p_offer_id
  for update of o;

  if v_owner is null then
    raise exception 'No encontramos el producto o servicio' using errcode = 'P0002';
  end if;

  if v_owner <> v_user and not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  v_usage := public.offer_usage(p_offer_id);

  if (v_usage->>'orders')::int > 0 or (v_usage->>'chats')::int > 0 then
    raise exception 'OFFER_HAS_ACTIVITY' using errcode = '23503';
  end if;

  delete from public.offers
  where id = p_offer_id;
end;
$$;

revoke all on function public.delete_offer(uuid) from public, anon;
grant execute on function public.delete_offer(uuid) to authenticated, service_role;

-- Red de seguridad: un DELETE directo por API también respeta la regla.
drop policy if exists offers_delete on public.offers;
create policy offers_delete on public.offers
  as restrictive
  for delete to authenticated
  using (
    public.is_admin()
    or (
      public.owns_business(business_id)
      and (public.offer_usage(id)->>'orders')::int = 0
      and (public.offer_usage(id)->>'chats')::int = 0
    )
  );

