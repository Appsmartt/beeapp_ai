-- Seguidores de estados y claves externas para sincronizar correo y calendarios.

create unique index if not exists mail_messages_external_uidx
    on public.mail_messages (user_id, integration_id, external_id);

create unique index if not exists events_external_uidx
    on public.events (calendar_id, external_id);

create unique index if not exists calendars_external_uidx
    on public.calendars (owner_id, integration_id, external_id);

create or replace function public.list_status_follows(p_scope text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_user uuid := auth.uid();
begin
    if v_user is null then
        raise exception 'No autorizado';
    end if;

    return coalesce((
        select jsonb_agg(jsonb_build_object(
            'id', c.id,
            'owner_id', c.owner_id,
            'linked_user_id', c.linked_user_id,
            'notes', c.notes,
            'created_at', c.created_at,
            'updated_at', c.updated_at,
            'person_id', case
                when p_scope in ('followers', 'requests') then c.owner_id
                else c.linked_user_id
            end,
            'display_name', trim(both ' ' from coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')),
            'avatar_file_id', p.avatar_file_id
        ))
        from public.contacts c
        left join public.profiles p
            on p.id = case
                when p_scope in ('followers', 'requests') then c.owner_id
                else c.linked_user_id
            end
        where c.kind = 'follow'
          and (
                (p_scope = 'following' and c.owner_id = v_user and coalesce(c.notes, 'accepted') = 'accepted')
                or (p_scope = 'followers' and c.linked_user_id = v_user and coalesce(c.notes, 'accepted') = 'accepted')
                or (p_scope = 'requests' and c.linked_user_id = v_user and c.notes = 'pending')
          )
    ), '[]'::jsonb);
end;
$$;

create or replace function public.respond_status_follow(p_follow_id uuid, p_state text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user uuid := auth.uid();
    v_row public.contacts;
begin
    if v_user is null then
        raise exception 'No autorizado';
    end if;

    if p_state not in ('accepted', 'rejected') then
        raise exception 'Estado no válido';
    end if;

    update public.contacts
    set notes = p_state,
        updated_at = now()
    where id = p_follow_id
      and linked_user_id = v_user
      and kind = 'follow'
    returning * into v_row;

    if v_row.id is null then
        raise exception 'Solicitud no encontrada';
    end if;

    return to_jsonb(v_row);
end;
$$;

create or replace function public.delete_status_follow(p_follow_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user uuid := auth.uid();
    v_deleted uuid;
begin
    if v_user is null then
        raise exception 'No autorizado';
    end if;

    delete from public.contacts
    where id = p_follow_id
      and kind = 'follow'
      and (owner_id = v_user or linked_user_id = v_user)
    returning id into v_deleted;

    if v_deleted is null then
        raise exception 'Seguimiento no encontrado';
    end if;
end;
$$;

revoke all on function public.list_status_follows(text) from public, anon;
revoke all on function public.respond_status_follow(uuid, text) from public, anon;
revoke all on function public.delete_status_follow(uuid) from public, anon;

grant execute on function public.list_status_follows(text) to authenticated;
grant execute on function public.respond_status_follow(uuid, text) to authenticated;
grant execute on function public.delete_status_follow(uuid) to authenticated;
