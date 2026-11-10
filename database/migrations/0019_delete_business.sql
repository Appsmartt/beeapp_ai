-- Eliminación segura de negocios: solo si nunca se usaron.
--
-- Un negocio "se usó" cuando tiene compras/solicitudes (orders) o chats con
-- mensajes o llamadas. Las conversaciones vacías (el cliente abrió el chat y
-- no escribió) no bloquean y se borran junto con el negocio.

-- Contadores de uso del negocio.
create or replace function public.business_usage(p_business_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'orders', (
      select count(*)::int
      from public.orders as o
      where o.business_id = p_business_id
    ),
    'chats', (
      select count(*)::int
      from public.conversations as c
      where c.business_id = p_business_id
        and c.kind = 'business'
        and (
          exists (
            select 1 from public.messages as m
            where m.conversation_id = c.id
          )
          or exists (
            select 1 from public.calls as k
            where k.conversation_id = c.id
          )
        )
    )
  );
$$;

revoke all on function public.business_usage(uuid) from public, anon;
grant execute on function public.business_usage(uuid) to authenticated, service_role;

-- Estado de eliminación para la app. Solo el dueño (o un admin) lo consulta.
create or replace function public.get_business_delete_status(p_business_id uuid)
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
  select owner_id
    into v_owner
  from public.businesses
  where id = p_business_id;

  if v_owner is null then
    raise exception 'No encontramos el negocio' using errcode = 'P0002';
  end if;

  if v_owner <> auth.uid() and not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  v_usage := public.business_usage(p_business_id);

  return v_usage || jsonb_build_object(
    'can_delete',
    (v_usage->>'orders')::int = 0 and (v_usage->>'chats')::int = 0
  );
end;
$$;

revoke all on function public.get_business_delete_status(uuid) from public, anon;
grant execute on function public.get_business_delete_status(uuid) to authenticated, service_role;

-- Eliminación atómica. FOR UPDATE bloquea el negocio: si un cliente crea un
-- pedido o chat al mismo tiempo, su llave foránea espera y falla limpio.
create or replace function public.delete_business(p_business_id uuid)
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

  select owner_id
    into v_owner
  from public.businesses
  where id = p_business_id
  for update;

  if v_owner is null then
    raise exception 'No encontramos el negocio' using errcode = 'P0002';
  end if;

  if v_owner <> v_user and not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  v_usage := public.business_usage(p_business_id);

  if (v_usage->>'orders')::int > 0 or (v_usage->>'chats')::int > 0 then
    raise exception 'BUSINESS_HAS_ACTIVITY' using errcode = '23503';
  end if;

  -- Solo quedan conversaciones vacías: se borran para no dejarlas huérfanas.
  delete from public.conversations
  where business_id = p_business_id
    and kind = 'business';

  delete from public.businesses
  where id = p_business_id;
end;
$$;

revoke all on function public.delete_business(uuid) from public, anon;
grant execute on function public.delete_business(uuid) to authenticated, service_role;

-- Red de seguridad: un DELETE directo por API también respeta la regla.
-- Los cascades desde profiles no pasan por RLS, así que borrar una cuenta
-- sigue funcionando.
drop policy if exists businesses_delete on public.businesses;
create policy businesses_delete on public.businesses
  as restrictive
  for delete to authenticated
  using (
    public.is_admin()
    or (
      owner_id = (select auth.uid())
      and (public.business_usage(id)->>'orders')::int = 0
      and (public.business_usage(id)->>'chats')::int = 0
    )
  );

