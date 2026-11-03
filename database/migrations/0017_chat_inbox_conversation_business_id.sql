-- Expone el negocio de cada conversación para que la bandeja comercial
-- no dependa de la identidad estampada en el cliente.

create or replace function public.get_chat_inbox(
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
        conversation.business_id as conversation_business_id,
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
