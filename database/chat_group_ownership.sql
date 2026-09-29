-- Supabase SQL. Apply manually to a project with the BeeApp chat schema.
-- The creator identity is historical and must not change on ownership transfer:
-- existing group images are validated against their original creator.

begin;

create or replace function public.transfer_chat_group_ownership(
  p_conversation_id uuid,
  p_current_owner_identity_id uuid,
  p_new_owner_identity_id uuid
)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_target_role public.chat_participant_role;
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  if p_current_owner_identity_id = p_new_owner_identity_id then
    raise exception 'CHAT_NEW_OWNER_MUST_BE_DIFFERENT';
  end if;

  if not public.chat_user_is_group_owner(
    p_conversation_id,
    p_current_owner_identity_id,
    auth.uid()
  ) then
    raise exception 'CHAT_ONLY_GROUP_OWNER_CAN_TRANSFER_OWNERSHIP';
  end if;

  select cp.role
  into v_target_role
  from public.chat_conversation_participants cp
  where cp.conversation_id = p_conversation_id
    and cp.identity_id = p_new_owner_identity_id
    and cp.left_at is null
    and cp.removed_at is null
  for update;

  if v_target_role is null then
    raise exception 'CHAT_NEW_OWNER_MUST_BE_ACTIVE_PARTICIPANT';
  end if;

  update public.chat_conversation_participants
  set role = case
    when identity_id = p_current_owner_identity_id
      then 'admin'::public.chat_participant_role
    when identity_id = p_new_owner_identity_id
      then 'owner'::public.chat_participant_role
    else role
  end
  where conversation_id = p_conversation_id
    and identity_id in (
      p_current_owner_identity_id,
      p_new_owner_identity_id
    );

  update public.chat_conversations
  set posting_identity_id = p_new_owner_identity_id
  where id = p_conversation_id
    and conversation_type = 'group'
    and is_active = true;

  if not found then
    raise exception 'CHAT_GROUP_NOT_FOUND_OR_INACTIVE';
  end if;

  return true;
end;
$function$;

create or replace function public.deactivate_chat_group_if_sole_owner(
  p_conversation_id uuid,
  p_owner_identity_id uuid
)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_other_members integer;
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  perform 1
  from public.chat_conversations as c
  where c.id = p_conversation_id
    and c.conversation_type = 'group'
    and c.is_active = true
  for update;

  if not found then
    raise exception 'CHAT_GROUP_NOT_FOUND_OR_INACTIVE';
  end if;

  if not public.chat_user_is_group_owner(
    p_conversation_id,
    p_owner_identity_id,
    auth.uid()
  ) then
    raise exception 'CHAT_ONLY_GROUP_OWNER_CAN_DEACTIVATE';
  end if;

  perform i.id
  from public.chat_group_invites as i
  where i.conversation_id = p_conversation_id
    and i.status = 'pending'
  order by i.id
  for update;

  select count(*)::integer
  into v_other_members
  from public.chat_conversation_participants as cp
  where cp.conversation_id = p_conversation_id
    and cp.identity_id <> p_owner_identity_id
    and cp.left_at is null
    and cp.removed_at is null;

  if v_other_members > 0 then
    raise exception 'CHAT_GROUP_HAS_OTHER_ACTIVE_PARTICIPANTS';
  end if;

  update public.chat_conversations
  set is_active = false
  where id = p_conversation_id
    and conversation_type = 'group'
    and is_active = true;

  if not found then
    raise exception 'CHAT_GROUP_NOT_FOUND_OR_INACTIVE';
  end if;

  update public.chat_group_invites
  set status = 'cancelled',
      responded_at = coalesce(responded_at, now())
  where conversation_id = p_conversation_id
    and status = 'pending';

  return true;
end;
$function$;

revoke execute on function public.transfer_chat_group_ownership(uuid, uuid, uuid)
  from public, anon;
revoke execute on function public.deactivate_chat_group_if_sole_owner(uuid, uuid)
  from public, anon;
grant execute on function public.transfer_chat_group_ownership(uuid, uuid, uuid)
  to authenticated, service_role;
grant execute on function public.deactivate_chat_group_if_sole_owner(uuid, uuid)
  to authenticated, service_role;

commit;
