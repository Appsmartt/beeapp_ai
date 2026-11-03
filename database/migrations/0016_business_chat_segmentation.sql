-- Separa el inbox personal del inbox de cada negocio y permite
-- responder como el negocio (sender_business_id).

update public.conversation_members as member
set business_id = conversation.business_id
from public.conversations as conversation
join public.businesses as business
  on business.id = conversation.business_id
where member.conversation_id = conversation.id
  and conversation.kind = 'business'
  and member.user_id = business.owner_id
  and member.business_id is null
  and exists (
    select 1
    from public.conversation_members as customer
    where customer.conversation_id = conversation.id
      and customer.user_id is distinct from business.owner_id
  );

drop function if exists public.get_chat_inbox(integer);

create function public.get_chat_inbox(
  p_limit integer default 50,
  p_business_id uuid default null
)
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

  if p_business_id is not null and not exists (
    select 1
    from public.businesses
    where id = p_business_id
      and owner_id = v_user
  ) then
    raise exception 'No autorizado';
  end if;

  return (
    select coalesce(jsonb_agg(row_to_json(inbox_row)), '[]'::jsonb)
    from (
      select
        conversation.id as conversation_id,
        conversation.kind as conversation_type,
        conversation.name as group_name,
        conversation.description as group_description,
        conversation.image_file_id as group_image_file_id,
        case
          when p_business_id is null and conversation.kind = 'business'
            then null
          else other_profile.id
        end as other_profile_id,
        case
          when p_business_id is null and conversation.kind = 'business'
            then conversation.business_id
          else null
        end as other_commercial_profile_id,
        case
          when p_business_id is null and conversation.kind = 'business'
            then 'commercial_profile'
          when other_profile.id is not null
            then 'profile'
          else null
        end as other_identity_type,
        case
          when p_business_id is null and conversation.kind = 'business'
            then business.display_name
          when conversation.kind = 'direct' or p_business_id is not null
            then trim(
              coalesce(other_profile.first_name, '')
              || ' '
              || coalesce(other_profile.last_name, '')
            )
          else coalesce(conversation.name, 'Conversación')
        end as other_display_name,
        case
          when p_business_id is null and conversation.kind = 'business'
            then business.logo_file_id
          when conversation.kind = 'direct' or p_business_id is not null
            then other_profile.avatar_file_id
          else conversation.image_file_id
        end as other_logo_file_id,
        last_msg.id as last_message_id,
        last_msg.kind as last_message_type,
        coalesce(last_msg.body, '') as last_message_preview,
        last_msg.created_at as last_message_at,
        coalesce(last_msg.sender_business_id, last_msg.sender_id)
          as last_message_sender_identity_id,
        (
          select count(*)::int
          from public.messages as unread
          where unread.conversation_id = conversation.id
            and unread.seq > member.last_read_seq
            and unread.deleted_at is null
            and (
              (
                p_business_id is not null
                and unread.sender_business_id is distinct from p_business_id
              )
              or (
                p_business_id is null
                and (
                  unread.sender_id is distinct from v_user
                  or unread.sender_business_id is not null
                )
              )
            )
        ) as unread_count,
        member.last_read_at,
        not member.muted as notifications_enabled,
        member.pinned,
        member.category
      from public.conversation_members as member
      join public.conversations as conversation
        on conversation.id = member.conversation_id
      left join public.businesses as business
        on business.id = conversation.business_id
      left join lateral (
        select message.*
        from public.messages as message
        where message.conversation_id = conversation.id
          and message.deleted_at is null
        order by message.seq desc
        limit 1
      ) as last_msg on true
      left join lateral (
        select profile.*
        from public.conversation_members as other_member
        join public.profiles as profile
          on profile.id = other_member.user_id
        where other_member.conversation_id = conversation.id
          and other_member.status = 'active'
          and other_member.business_id is null
          and (
            p_business_id is not null
            or other_member.user_id is distinct from v_user
          )
        limit 1
      ) as other_profile on true
      where member.user_id = v_user
        and member.status = 'active'
        and (
          (
            p_business_id is null
            and member.business_id is null
          )
          or (
            p_business_id is not null
            and member.business_id = p_business_id
            and conversation.business_id = p_business_id
          )
        )
      order by last_msg.created_at desc nulls last
      limit least(coalesce(p_limit, 50), 100)
    ) as inbox_row
  );
end;
$$;

revoke all on function public.get_chat_inbox(integer, uuid) from public, anon;
grant execute on function public.get_chat_inbox(integer, uuid) to authenticated, service_role;

create or replace function public.get_business_chat_unread_counts()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(row_to_json(summary)), '[]'::jsonb)
  from (
    select
      business.id as business_id,
      business.display_name,
      coalesce((
        select count(*)::int
        from public.conversation_members as member
        join public.conversations as conversation
          on conversation.id = member.conversation_id
        where member.user_id = auth.uid()
          and member.business_id = business.id
          and member.status = 'active'
          and conversation.business_id = business.id
          and conversation.kind = 'business'
      ), 0) as conversation_count,
      coalesce((
        select count(*)::int
        from public.conversation_members as member
        join public.conversations as conversation
          on conversation.id = member.conversation_id
        join public.messages as unread
          on unread.conversation_id = conversation.id
         and unread.seq > member.last_read_seq
         and unread.deleted_at is null
         and unread.sender_business_id is distinct from business.id
        where member.user_id = auth.uid()
          and member.business_id = business.id
          and member.status = 'active'
          and conversation.business_id = business.id
          and conversation.kind = 'business'
      ), 0) as unread_count
    from public.businesses as business
    where business.owner_id = auth.uid()
    order by business.display_name
  ) as summary;
$$;

revoke all on function public.get_business_chat_unread_counts() from public, anon;
grant execute on function public.get_business_chat_unread_counts() to authenticated, service_role;

create or replace function public.create_business_chat(p_business_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_owner uuid;
  v_name text;
  v_id uuid;
begin
  if v_user is null or not public.has_active_device() then
    raise exception 'No autorizado';
  end if;

  select owner_id, display_name
    into v_owner, v_name
  from public.businesses
  where id = p_business_id;

  if v_owner is null then
    raise exception 'No encontramos el negocio';
  end if;

  if v_owner = v_user then
    raise exception 'No puedes chatear con tu propio negocio';
  end if;

  select conversation.id
    into v_id
  from public.conversations as conversation
  join public.conversation_members as member
    on member.conversation_id = conversation.id
   and member.user_id = v_user
   and member.business_id is null
  where conversation.kind = 'business'
    and conversation.business_id = p_business_id
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  insert into public.conversations (kind, name, owner_id, business_id)
  values ('business', v_name, v_owner, p_business_id)
  returning id into v_id;

  insert into public.conversation_members (conversation_id, user_id, role)
  values (v_id, v_user, 'member');

  insert into public.conversation_members (
    conversation_id,
    user_id,
    business_id,
    role
  )
  values (v_id, v_owner, p_business_id, 'owner');

  return v_id;
end;
$$;

drop policy if exists messages_write on public.messages;

create policy messages_write on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.is_conversation_member(conversation_id)
    and (
      sender_business_id is null
      or exists (
        select 1
        from public.businesses as business
        join public.conversation_members as member
          on member.business_id = business.id
         and member.conversation_id = messages.conversation_id
         and member.user_id = (select auth.uid())
         and member.status = 'active'
        join public.conversations as conversation
          on conversation.id = member.conversation_id
         and conversation.business_id = business.id
        where business.id = sender_business_id
          and business.owner_id = (select auth.uid())
      )
    )
  );
