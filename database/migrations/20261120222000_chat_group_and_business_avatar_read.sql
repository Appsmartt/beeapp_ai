-- Extiende la resolución y lectura segura de imágenes de avatar en chat:
-- 1) Fotos de perfil (profiles.avatar_file_id)
-- 2) Logos de negocios (businesses.logo_file_id)
-- 3) Imágenes de grupos/comunidades para miembros activos (conversations.image_file_id)

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
    where file.bucket = p_bucket
      and file.path = p_name
      and (
        exists (
          select 1
          from public.profiles as profile
          where profile.avatar_file_id = file.id
        )
        or exists (
          select 1
          from public.conversations as conversation
          join public.conversation_members as member
            on member.conversation_id = conversation.id
          where conversation.image_file_id = file.id
            and member.user_id = auth.uid()
            and member.status = 'active'
        )
      )
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
    and (
      exists (
        select 1
        from public.profiles as profile
        where profile.avatar_file_id = file.id
      )
      or exists (
        select 1
        from public.businesses as business
        where business.logo_file_id = file.id
      )
      or exists (
        select 1
        from public.conversations as conversation
        join public.conversation_members as member
          on member.conversation_id = conversation.id
        where conversation.image_file_id = file.id
          and member.user_id = auth.uid()
          and member.status = 'active'
      )
    )
  limit 100;
$$;
