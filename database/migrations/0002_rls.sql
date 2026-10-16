create or replace function public.has_active_device()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.devices d
    where d.user_id = auth.uid()
      and d.auth_session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid
      and d.is_active
      and d.revoked_at is null
      and (d.expires_at is null or d.expires_at > now())
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('ADMIN', 'SUPER_ADMIN')
  );
$$;

create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.owns_business(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.businesses
    where id = p_business_id and owner_id = auth.uid()
  );
$$;

create or replace function public.is_blocked(p_owner uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.contacts
    where owner_id = p_owner
      and linked_user_id = p_user
      and kind = 'block'
  );
$$;

revoke all on function public.has_active_device() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_conversation_member(uuid) from public, anon;
revoke all on function public.owns_business(uuid) from public, anon;
revoke all on function public.is_blocked(uuid, uuid) from public, anon;
grant execute on function public.has_active_device() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_conversation_member(uuid) to authenticated, service_role;
grant execute on function public.owns_business(uuid) to authenticated, service_role;
grant execute on function public.is_blocked(uuid, uuid) to authenticated, service_role;

do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format(
      'create policy device_required on public.%I as restrictive for all to authenticated using (public.has_active_device()) with check (public.has_active_device())',
      r.tablename
    );
  end loop;
end $$;

create policy profiles_select on public.profiles for select to authenticated
  using ((select auth.uid()) = id or is_public or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using ((select auth.uid()) = id or public.is_admin())
  with check ((select auth.uid()) = id or public.is_admin());
create policy profiles_insert on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

create policy devices_own on public.devices for all to authenticated
  using (user_id = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()) or public.is_admin());

create policy qr_own on public.qr_logins for all to authenticated
  using (
    public.is_admin()
    or device_id in (select id from public.devices where user_id = (select auth.uid()))
  )
  with check (
    device_id is null
    or device_id in (select id from public.devices where user_id = (select auth.uid()))
  );

create policy contacts_own on public.contacts for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy categories_read on public.categories for select to anon, authenticated
  using (is_active or public.is_admin());
create policy categories_admin on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy businesses_read on public.businesses for select to anon, authenticated
  using (
    public.is_admin()
    or owner_id = (select auth.uid())
    or (is_public and publication_status = 'published' and archived_at is null)
  );
create policy businesses_write on public.businesses for all to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin())
  with check (owner_id = (select auth.uid()) or public.is_admin());

create policy conversations_read on public.conversations for select to authenticated
  using (
    public.is_admin()
    or owner_id = (select auth.uid())
    or kind = 'community'
    or public.is_conversation_member(id)
  );
create policy conversations_write on public.conversations for all to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin())
  with check (owner_id = (select auth.uid()) or public.is_admin());

create policy members_read on public.conversation_members for select to authenticated
  using (
    public.is_admin()
    or user_id = (select auth.uid())
    or public.is_conversation_member(conversation_id)
  );
create policy members_write on public.conversation_members for all to authenticated
  using (
    public.is_admin()
    or user_id = (select auth.uid())
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.owner_id = (select auth.uid())
    )
  )
  with check (
    public.is_admin()
    or user_id = (select auth.uid())
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.owner_id = (select auth.uid())
    )
  );

create policy messages_read on public.messages for select to authenticated
  using (public.is_admin() or public.is_conversation_member(conversation_id));
create policy messages_write on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.is_conversation_member(conversation_id)
  );
create policy messages_update on public.messages for update to authenticated
  using (sender_id = (select auth.uid()) or public.is_admin())
  with check (sender_id = (select auth.uid()) or public.is_admin());

create policy calls_read on public.calls for select to authenticated
  using (
    public.is_admin()
    or started_by = (select auth.uid())
    or public.is_conversation_member(conversation_id)
  );
create policy calls_write on public.calls for all to authenticated
  using (started_by = (select auth.uid()) or public.is_admin() or public.is_conversation_member(conversation_id))
  with check (started_by = (select auth.uid()) or public.is_admin());

create policy files_read on public.files for select to authenticated
  using (
    public.is_admin()
    or owner_id = (select auth.uid())
    or shared_with @> array[(select auth.uid())]
  );
create policy files_write on public.files for all to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin())
  with check (owner_id = (select auth.uid()) or public.is_admin());

create policy notes_own on public.notes for all to authenticated
  using (
    owner_id = (select auth.uid())
    or shared_with @> jsonb_build_array((select auth.uid())::text)
    or public.is_admin()
  )
  with check (owner_id = (select auth.uid()) or public.is_admin());

create policy statuses_read on public.statuses for select to authenticated
  using (
    author_id = (select auth.uid())
    or public.is_admin()
    or (
      archived_at is null
      and (expires_at is null or expires_at > now())
      and not public.is_blocked(author_id, (select auth.uid()))
    )
  );
create policy statuses_write on public.statuses for all to authenticated
  using (author_id = (select auth.uid()) or public.is_admin())
  with check (author_id = (select auth.uid()) or public.is_admin());

create policy status_views_read on public.status_views for select to authenticated
  using (
    viewer_id = (select auth.uid())
    or exists (
      select 1 from public.statuses s
      where s.id = status_id and s.author_id = (select auth.uid())
    )
  );
create policy status_views_insert on public.status_views for insert to authenticated
  with check (viewer_id = (select auth.uid()));

create policy offers_read on public.offers for select to anon, authenticated
  using (
    public.owns_business(business_id)
    or public.is_admin()
    or exists (
      select 1 from public.businesses b
      where b.id = business_id
        and b.is_public
        and b.publication_status = 'published'
        and b.archived_at is null
    )
  );
create policy offers_write on public.offers for all to authenticated
  using (public.owns_business(business_id) or public.is_admin())
  with check (public.owns_business(business_id) or public.is_admin());

create policy orders_read on public.orders for select to authenticated
  using (
    customer_id = (select auth.uid())
    or public.owns_business(business_id)
    or public.is_admin()
  );
create policy orders_insert on public.orders for insert to authenticated
  with check (customer_id = (select auth.uid()));
create policy orders_update on public.orders for update to authenticated
  using (
    customer_id = (select auth.uid())
    or public.owns_business(business_id)
    or public.is_admin()
  )
  with check (
    customer_id = (select auth.uid())
    or public.owns_business(business_id)
    or public.is_admin()
  );

create policy integrations_own on public.integrations for all to authenticated
  using (user_id = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()) or public.is_admin());

create policy calendars_own on public.calendars for all to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin())
  with check (owner_id = (select auth.uid()) or public.is_admin());

create policy events_own on public.events for all to authenticated
  using (
    public.is_admin()
    or organizer_id = (select auth.uid())
    or exists (
      select 1 from public.calendars c
      where c.id = calendar_id and c.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.calendars c
      where c.id = calendar_id and (c.owner_id = (select auth.uid()) or public.is_admin())
    )
  );

create policy mail_own on public.mail_messages for all to authenticated
  using (user_id = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()) or public.is_admin());

create policy notifications_own on public.notifications for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()) or public.is_admin());

create policy campaigns_admin on public.notification_campaigns for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy plans_read on public.plans for select to authenticated
  using (is_active or public.is_admin());
create policy plans_admin on public.plans for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy subscriptions_read on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy subscriptions_admin on public.subscriptions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy payments_read on public.payments for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy payments_admin on public.payments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy settings_read on public.app_settings for select to authenticated
  using (true);
create policy settings_admin on public.app_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy moderation_read on public.moderation for select to authenticated
  using (
    public.is_admin()
    or reporter_id = (select auth.uid())
    or user_id = (select auth.uid())
  );
create policy moderation_report on public.moderation for insert to authenticated
  with check (kind = 'report' and reporter_id = (select auth.uid()));
create policy moderation_admin on public.moderation for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy activity_admin on public.activity_log for select to authenticated
  using (public.is_admin());
