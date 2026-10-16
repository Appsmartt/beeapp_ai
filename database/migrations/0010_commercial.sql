-- Catálogos del negocio, datos del pedido y chat con un negocio.

alter table public.businesses
  add column if not exists catalogs jsonb not null default '[]'::jsonb;

alter table public.orders
  add column if not exists request_type text not null default 'product_order',
  add column if not exists code text,
  add column if not exists requested_modality text,
  add column if not exists customer_note text,
  add column if not exists delivery_address text,
  add column if not exists delivery_reference text,
  add column if not exists delivery_fee_mode text,
  add column if not exists subtotal_amount bigint not null default 0,
  add column if not exists delivery_fee_amount bigint,
  add column if not exists expires_at timestamptz,
  add column if not exists idempotency_key text;

create unique index if not exists orders_customer_idempotency_idx
  on public.orders (customer_id, idempotency_key)
  where idempotency_key is not null;

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

  select conversation.id
    into v_id
  from public.conversations as conversation
  join public.conversation_members as member
    on member.conversation_id = conversation.id
   and member.user_id = v_user
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

  if v_owner <> v_user then
    insert into public.conversation_members (
      conversation_id,
      user_id,
      business_id,
      role
    )
    values (v_id, v_owner, p_business_id, 'owner');
  end if;

  return v_id;
end;
$$;

revoke all on function public.create_business_chat(uuid) from public, anon;
grant execute on function public.create_business_chat(uuid) to authenticated;
