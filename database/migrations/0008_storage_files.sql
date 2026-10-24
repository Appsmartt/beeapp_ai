-- Papelera, favoritos y compartidos de archivos.
-- shared_with (uuid[]) sigue alimentando la política files_read.

alter table public.files
  add column if not exists trashed_at timestamptz,
  add column if not exists is_starred boolean not null default false,
  add column if not exists shares jsonb not null default '[]'::jsonb;

create index if not exists files_owner_kind_idx
  on public.files (owner_id, kind, created_at desc);

create or replace function public.hide_file_share(p_share_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_active_device() then
    raise exception 'No autorizado';
  end if;

  update public.files
  set shares = (
        select coalesce(jsonb_agg(
          case
            when share->>'id' = p_share_id::text
             and share->>'shared_with_user_id' = auth.uid()::text
            then share || jsonb_build_object(
              'hidden_at', now(),
              'updated_at', now()
            )
            else share
          end
        ), '[]'::jsonb)
        from jsonb_array_elements(shares) as share
      ),
      updated_at = now()
  where shares @> jsonb_build_array(
    jsonb_build_object(
      'id', p_share_id::text,
      'shared_with_user_id', auth.uid()::text
    )
  );

  if not found then
    raise exception 'No encontramos el archivo compartido';
  end if;
end;
$$;

create or replace function public.revoke_file_share(p_share_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  if auth.uid() is null or not public.has_active_device() then
    raise exception 'No autorizado';
  end if;

  select share->>'shared_with_user_id'
    into v_user
  from public.files as file
  cross join lateral jsonb_array_elements(file.shares) as share
  where file.owner_id = auth.uid()
    and share->>'id' = p_share_id::text
  limit 1;

  if v_user is null then
    raise exception 'No encontramos el archivo compartido';
  end if;

  update public.files
  set shares = (
        select coalesce(jsonb_agg(
          case
            when share->>'id' = p_share_id::text
            then share || jsonb_build_object(
              'revoked_at', now(),
              'updated_at', now()
            )
            else share
          end
        ), '[]'::jsonb)
        from jsonb_array_elements(shares) as share
      ),
      shared_with = array_remove(shared_with, v_user::uuid),
      updated_at = now()
  where owner_id = auth.uid()
    and shares @> jsonb_build_array(jsonb_build_object('id', p_share_id::text));
end;
$$;

revoke all on function public.hide_file_share(uuid) from public, anon;
revoke all on function public.revoke_file_share(uuid) from public, anon;
grant execute on function public.hide_file_share(uuid) to authenticated;
grant execute on function public.revoke_file_share(uuid) to authenticated;
