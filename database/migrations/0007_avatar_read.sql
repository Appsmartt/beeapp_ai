-- Permite leer solo el objeto que hoy es la foto de un perfil.
-- device_required sigue exigiendo un dispositivo activo.

create or replace function public.is_profile_avatar_object(
  p_bucket text,
  p_name text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.files as file
    join public.profiles as profile
      on profile.avatar_file_id = file.id
    where file.bucket = p_bucket
      and file.path = p_name
  );
$$;

create or replace function public.profile_avatar_locations(
  p_file_ids uuid[]
)
returns table (
  file_id uuid,
  bucket text,
  path text
)
language sql
stable
security definer
set search_path = public
as $$
  select file.id, file.bucket, file.path
  from public.files as file
  where auth.uid() is not null
    and public.has_active_device()
    and file.id = any(coalesce(p_file_ids, array[]::uuid[]))
    and exists (
      select 1
      from public.profiles as profile
      where profile.avatar_file_id = file.id
    )
  limit 100;
$$;

revoke all on function public.is_profile_avatar_object(text, text) from public, anon;
revoke all on function public.profile_avatar_locations(uuid[]) from public, anon;
grant execute on function public.is_profile_avatar_object(text, text) to authenticated;
grant execute on function public.profile_avatar_locations(uuid[]) to authenticated;

drop policy if exists profile_avatar_read on storage.objects;
create policy profile_avatar_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'beeapp-files'
    and public.is_profile_avatar_object(bucket_id, name)
  );
