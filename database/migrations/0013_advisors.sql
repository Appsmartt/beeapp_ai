-- Advertencias de seguridad y de políticas permisivas duplicadas.
-- La protección de contraseñas filtradas no se puede activar por SQL:
-- Dashboard de Supabase, Authentication, Password security,
-- "Prevent use of leaked passwords" (puede requerir plan Pro).

-- pg_net no admite SET SCHEMA. No hay objetos de la app que dependan de él
-- y las funciones siguen viviendo en el esquema net.
drop extension if exists pg_net;
create extension pg_net schema extensions;

revoke all on function public.commerce_public_countries() from anon;
revoke all on function public.commerce_public_cities(text) from anon;
revoke all on function public.commerce_public_popular_categories(text, text, integer) from anon;

-- is_admin() y owns_business(uuid) siguen sin permiso para anon.
-- Para anon esas funciones siempre devuelven falso, así que la rama pública
-- queda en una política propia y no hace falta devolverles el permiso.

create or replace function public.admin_user_json(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to public
as $function$
declare
  result jsonb;
begin
  perform public.assert_admin();
  select jsonb_build_object(
    'id', p.id,
    'nombreCompleto', trim(p.first_name || ' ' || p.last_name),
    'email', coalesce(p.email, ''),
    'telefono', nullif(trim(coalesce(p.phone_dial_code, '') || ' ' || coalesce(p.phone_number, '')), ''),
    'iniciales', upper(left(coalesce(p.first_name, '?'), 1) || left(coalesce(p.last_name, ''), 1)),
    'estado', case p.account_status when 'active' then 'activo' when 'inactive' then 'inactivo' when 'suspended' then 'suspendido' when 'blocked' then 'bloqueado' when 'pending' then 'pendiente' else coalesce(p.account_status, 'activo') end,
    'planId', coalesce((select s.plan_id from public.subscriptions s where s.user_id = p.id and s.status = 'active' order by s.started_at desc limit 1), 'free'),
    'visibilidadRed', case p.network_visibility when 'public' then 'publico' when 'private' then 'privado' when 'team' then 'solo_equipo' else coalesce(p.network_visibility, 'publico') end,
    'fechaRegistro', p.created_at,
    'ultimoAcceso', coalesce((select max(d.last_seen_at) from public.devices d where d.user_id = p.id), p.created_at),
    'departamento', p.location,
    'cargo', p.occupation,
    'onboarding', jsonb_build_object('completado', true, 'pasoActual', 1, 'totalPasos', 1, 'fechaInicio', p.created_at),
    'metricasUso', jsonb_build_object(
      'mensajesEnviados', (select count(*) from public.messages m where m.sender_id = p.id),
      'llamadasRealizadas', (select count(*) from public.calls c where c.started_by = p.id),
      'almacenamientoUsadoGB', round(p.storage_used_bytes / 1073741824.0, 2),
      'ultimaConexion', coalesce((select max(d.last_seen_at) from public.devices d where d.user_id = p.id), p.created_at)
    ),
    'integraciones', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'nombre', i.provider, 'conectado', i.status = 'connected', 'fechaConexion', i.connected_at)) from public.integrations i where i.user_id = p.id), '[]'::jsonb),
    'reportesCount', (select count(*) from public.moderation r where r.kind = 'report' and r.user_id = p.id),
    'verificacionRed', case p.verification_status when 'unverified' then 'no_solicitado' when 'verified' then 'verificado' when 'pending' then 'pendiente' else coalesce(p.verification_status, 'no_solicitado') end,
    'actividadComercial', coalesce((select jsonb_build_object('tipo', case b.offer_type when 'products' then 'productos' when 'services' then 'servicios' when 'mixed' then 'ambos' else 'ninguno' end, 'rubro', c.name, 'descripcion', b.description, 'cantidadPublicaciones', (select count(*) from public.offers o where o.business_id = b.id), 'estadoPerfil', case when b.archived_at is not null then 'archivado' when b.is_available then 'activo' else 'inactivo' end) from public.businesses b left join public.categories c on c.id = b.category_id where b.owner_id = p.id order by b.created_at limit 1), jsonb_build_object('tipo', 'ninguno'))
  )
  into result
  from public.profiles p
  where p.id = p_user_id;
  return result;
end;
$function$;

-- Catálogo público: anon solo ve la rama que ya era verdadera sin sesión.

drop policy if exists businesses_read on public.businesses;
create policy businesses_public_read on public.businesses
  for select to anon
  using (is_public and publication_status = 'published' and archived_at is null);
create policy businesses_read on public.businesses
  for select to authenticated
  using (
    is_admin()
    or owner_id = (select auth.uid())
    or (is_public and publication_status = 'published' and archived_at is null)
  );

drop policy if exists categories_read on public.categories;
create policy categories_public_read on public.categories
  for select to anon
  using (is_active);
create policy categories_read on public.categories
  for select to authenticated
  using (is_active or is_admin());

drop policy if exists offers_read on public.offers;
create policy offers_public_read on public.offers
  for select to anon
  using (
    exists (
      select 1 from public.businesses b
      where b.id = offers.business_id
        and b.is_public
        and b.publication_status = 'published'
        and b.archived_at is null
    )
  );
create policy offers_read on public.offers
  for select to authenticated
  using (
    owns_business(business_id)
    or is_admin()
    or exists (
      select 1 from public.businesses b
      where b.id = offers.business_id
        and b.is_public
        and b.publication_status = 'published'
        and b.archived_at is null
    )
  );

-- Una sola política de lectura y escrituras separadas, para que SELECT
-- no evalúe también la política ALL.

drop policy if exists settings_admin on public.app_settings;
create policy settings_insert on public.app_settings
  for insert to authenticated
  with check (is_admin());
create policy settings_update on public.app_settings
  for update to authenticated
  using (is_admin())
  with check (is_admin());
create policy settings_delete on public.app_settings
  for delete to authenticated
  using (is_admin());

drop policy if exists businesses_write on public.businesses;
create policy businesses_insert on public.businesses
  for insert to authenticated
  with check ((owner_id = (select auth.uid())) or is_admin());
create policy businesses_update on public.businesses
  for update to authenticated
  using ((owner_id = (select auth.uid())) or is_admin())
  with check ((owner_id = (select auth.uid())) or is_admin());
create policy businesses_delete on public.businesses
  for delete to authenticated
  using ((owner_id = (select auth.uid())) or is_admin());

drop policy if exists calls_write on public.calls;
create policy calls_insert on public.calls
  for insert to authenticated
  with check ((started_by = (select auth.uid())) or is_admin());
create policy calls_update on public.calls
  for update to authenticated
  using ((started_by = (select auth.uid())) or is_admin() or is_conversation_member(conversation_id))
  with check ((started_by = (select auth.uid())) or is_admin());
create policy calls_delete on public.calls
  for delete to authenticated
  using ((started_by = (select auth.uid())) or is_admin() or is_conversation_member(conversation_id));

drop policy if exists categories_admin on public.categories;
create policy categories_insert on public.categories
  for insert to authenticated
  with check (is_admin());
create policy categories_update on public.categories
  for update to authenticated
  using (is_admin())
  with check (is_admin());
create policy categories_delete on public.categories
  for delete to authenticated
  using (is_admin());

drop policy if exists members_read on public.conversation_members;
create policy members_read on public.conversation_members
  for select to authenticated
  using (
    is_admin()
    or user_id = (select auth.uid())
    or is_conversation_member(conversation_id)
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_members.conversation_id
        and c.owner_id = (select auth.uid())
    )
  );

drop policy if exists members_write on public.conversation_members;
create policy members_insert on public.conversation_members
  for insert to authenticated
  with check (
    is_admin()
    or user_id = (select auth.uid())
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_members.conversation_id
        and c.owner_id = (select auth.uid())
    )
  );
create policy members_update on public.conversation_members
  for update to authenticated
  using (
    is_admin()
    or user_id = (select auth.uid())
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_members.conversation_id
        and c.owner_id = (select auth.uid())
    )
  )
  with check (
    is_admin()
    or user_id = (select auth.uid())
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_members.conversation_id
        and c.owner_id = (select auth.uid())
    )
  );
create policy members_delete on public.conversation_members
  for delete to authenticated
  using (
    is_admin()
    or user_id = (select auth.uid())
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_members.conversation_id
        and c.owner_id = (select auth.uid())
    )
  );

drop policy if exists conversations_write on public.conversations;
create policy conversations_insert on public.conversations
  for insert to authenticated
  with check ((owner_id = (select auth.uid())) or is_admin());
create policy conversations_update on public.conversations
  for update to authenticated
  using ((owner_id = (select auth.uid())) or is_admin())
  with check ((owner_id = (select auth.uid())) or is_admin());
create policy conversations_delete on public.conversations
  for delete to authenticated
  using ((owner_id = (select auth.uid())) or is_admin());

drop policy if exists files_write on public.files;
create policy files_insert on public.files
  for insert to authenticated
  with check ((owner_id = (select auth.uid())) or is_admin());
create policy files_update on public.files
  for update to authenticated
  using ((owner_id = (select auth.uid())) or is_admin())
  with check ((owner_id = (select auth.uid())) or is_admin());
create policy files_delete on public.files
  for delete to authenticated
  using ((owner_id = (select auth.uid())) or is_admin());

drop policy if exists moderation_admin on public.moderation;
drop policy if exists moderation_report on public.moderation;
create policy moderation_insert on public.moderation
  for insert to authenticated
  with check (
    is_admin()
    or (kind = 'report' and reporter_id = (select auth.uid()))
  );
create policy moderation_update on public.moderation
  for update to authenticated
  using (is_admin())
  with check (is_admin());
create policy moderation_delete on public.moderation
  for delete to authenticated
  using (is_admin());

drop policy if exists notes_own on public.notes;
drop policy if exists notes_shared_read on public.notes;
create policy notes_read on public.notes
  for select to authenticated
  using (
    (owner_id = (select auth.uid()))
    or is_admin()
    or exists (
      select 1
      from jsonb_array_elements(notes.shared_with) share(value)
      where (share.value ->> 'shared_with_user_id') = (select auth.uid())::text
        and coalesce(share.value ->> 'revoked_at', '') = ''
    )
  );
create policy notes_insert on public.notes
  for insert to authenticated
  with check ((owner_id = (select auth.uid())) or is_admin());
create policy notes_update on public.notes
  for update to authenticated
  using ((owner_id = (select auth.uid())) or is_admin())
  with check ((owner_id = (select auth.uid())) or is_admin());
create policy notes_delete on public.notes
  for delete to authenticated
  using ((owner_id = (select auth.uid())) or is_admin());

drop policy if exists offers_write on public.offers;
create policy offers_insert on public.offers
  for insert to authenticated
  with check (owns_business(business_id) or is_admin());
create policy offers_update on public.offers
  for update to authenticated
  using (owns_business(business_id) or is_admin())
  with check (owns_business(business_id) or is_admin());
create policy offers_delete on public.offers
  for delete to authenticated
  using (owns_business(business_id) or is_admin());

drop policy if exists payments_admin on public.payments;
create policy payments_insert on public.payments
  for insert to authenticated
  with check (is_admin());
create policy payments_update on public.payments
  for update to authenticated
  using (is_admin())
  with check (is_admin());
create policy payments_delete on public.payments
  for delete to authenticated
  using (is_admin());

drop policy if exists plans_admin on public.plans;
create policy plans_insert on public.plans
  for insert to authenticated
  with check (is_admin());
create policy plans_update on public.plans
  for update to authenticated
  using (is_admin())
  with check (is_admin());
create policy plans_delete on public.plans
  for delete to authenticated
  using (is_admin());

drop policy if exists statuses_write on public.statuses;
create policy statuses_insert on public.statuses
  for insert to authenticated
  with check ((author_id = (select auth.uid())) or is_admin());
create policy statuses_update on public.statuses
  for update to authenticated
  using ((author_id = (select auth.uid())) or is_admin())
  with check ((author_id = (select auth.uid())) or is_admin());
create policy statuses_delete on public.statuses
  for delete to authenticated
  using ((author_id = (select auth.uid())) or is_admin());

drop policy if exists subscriptions_admin on public.subscriptions;
create policy subscriptions_insert on public.subscriptions
  for insert to authenticated
  with check (is_admin());
create policy subscriptions_update on public.subscriptions
  for update to authenticated
  using (is_admin())
  with check (is_admin());
create policy subscriptions_delete on public.subscriptions
  for delete to authenticated
  using (is_admin());
