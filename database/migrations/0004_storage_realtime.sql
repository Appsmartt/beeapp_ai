-- Storage y Realtime del esquema compacto.
-- Las políticas de dispositivo en storage.objects aplican solo a authenticated.
-- La lectura de beeapp-commercial-images es pública.

drop policy if exists device_required on storage.objects;
drop policy if exists files_owner_read on storage.objects;
drop policy if exists files_owner_insert on storage.objects;
drop policy if exists files_owner_update on storage.objects;
drop policy if exists files_owner_delete on storage.objects;
drop policy if exists statuses_owner_read on storage.objects;
drop policy if exists statuses_owner_insert on storage.objects;
drop policy if exists commercial_public_read on storage.objects;
drop policy if exists commercial_owner_insert on storage.objects;

create policy device_required on storage.objects
  as restrictive for all to authenticated
  using (public.has_active_device())
  with check (public.has_active_device());

create policy files_owner_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'beeapp-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy files_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'beeapp-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy files_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'beeapp-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'beeapp-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy files_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'beeapp-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy statuses_owner_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'beeapp-statuses'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy statuses_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'beeapp-statuses'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy commercial_public_read on storage.objects
  for select to public
  using (bucket_id = 'beeapp-commercial-images');

create policy commercial_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'beeapp-commercial-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.conversation_members;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.calls;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;
