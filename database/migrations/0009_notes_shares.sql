-- Notas compartidas, adjuntos con metadatos y datos que la agenda guarda junto al evento.

alter table public.notes
  add column if not exists color text,
  add column if not exists position text,
  add column if not exists template_id uuid,
  add column if not exists last_opened_at timestamptz,
  add column if not exists purge_after timestamptz;

alter table public.events
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.qr_logins
  add column if not exists approved_by uuid references public.profiles(id);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notes'
      and column_name = 'attachments'
      and udt_name = '_uuid'
  ) then
    alter table public.notes
      add column attachments_doc jsonb not null default '[]'::jsonb;

    execute '
      update public.notes
      set attachments_doc = coalesce((
        select jsonb_agg(
          jsonb_build_object(
            ''id'', gen_random_uuid(),
            ''file_id'', item,
            ''attachment_type'', ''attachment'',
            ''display_order'', ord - 1,
            ''created_at'', now()
          )
        )
        from unnest(notes.attachments) with ordinality as entry(item, ord)
      ), ''[]''::jsonb)
    ';

    alter table public.notes drop column attachments;
    alter table public.notes rename column attachments_doc to attachments;
  end if;
end $$;

drop policy if exists notes_shared_read on public.notes;

create policy notes_shared_read on public.notes
  for select to authenticated
  using (
    exists (
      select 1
      from jsonb_array_elements(shared_with) as share
      where share->>'shared_with_user_id' = (select auth.uid())::text
        and coalesce(share->>'revoked_at', '') = ''
    )
  );

create or replace function public.hide_note_share(p_share_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_active_device() then
    raise exception 'No autorizado';
  end if;

  update public.notes
  set shared_with = (
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
        from jsonb_array_elements(shared_with) as share
      ),
      updated_at = now()
  where shared_with @> jsonb_build_array(
    jsonb_build_object(
      'id', p_share_id::text,
      'shared_with_user_id', auth.uid()::text
    )
  );

  if not found then
    raise exception 'No encontramos la nota compartida';
  end if;
end;
$$;

create or replace function public.revoke_note_share(p_share_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_active_device() then
    raise exception 'No autorizado';
  end if;

  update public.notes
  set shared_with = (
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
        from jsonb_array_elements(shared_with) as share
      ),
      updated_at = now()
  where owner_id = auth.uid()
    and shared_with @> jsonb_build_array(
      jsonb_build_object('id', p_share_id::text)
    );

  if not found then
    raise exception 'No encontramos la nota compartida';
  end if;
end;
$$;

revoke all on function public.hide_note_share(uuid) from public, anon;
revoke all on function public.revoke_note_share(uuid) from public, anon;
grant execute on function public.hide_note_share(uuid) to authenticated;
grant execute on function public.revoke_note_share(uuid) to authenticated;

create or replace function public.ensure_default_calendar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.calendars (
    owner_id,
    name,
    color,
    is_default,
    visibility
  )
  values (new.id, 'Mi agenda', '#6025D2', true, 'private');
  return new;
end;
$$;

drop trigger if exists profiles_default_calendar on public.profiles;

create trigger profiles_default_calendar
  after insert on public.profiles
  for each row execute function public.ensure_default_calendar();

insert into public.calendars (
  owner_id,
  name,
  color,
  is_default,
  visibility
)
select profile.id, 'Mi agenda', '#6025D2', true, 'private'
from public.profiles as profile
where not exists (
  select 1
  from public.calendars as calendar
  where calendar.owner_id = profile.id
);
