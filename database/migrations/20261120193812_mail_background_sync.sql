-- One checkpoint per mailbox. Only the importer may claim a mailbox or advance its cursor.
create table public.mail_sync_state (
  integration_id uuid primary key references public.integrations(id) on delete cascade,
  connection_started_at timestamptz,
  synced_through timestamptz,
  window_end timestamptz,
  page_cursor text,
  next_attempt_at timestamptz not null default now(),
  dispatch_ticket uuid,
  lease_id uuid,
  lease_until timestamptz,
  last_success_at timestamptz,
  last_error_code text
);

alter table public.mail_sync_state enable row level security;
revoke all on public.mail_sync_state from public, anon, authenticated;
grant select, insert, update on public.mail_sync_state to service_role;

-- A ticket is valid once, for one mailbox, and only until the next dispatch.
-- The endpoint comes from this project's Vault (e.g. https://PROJECT.supabase.co/functions/v1/mail-sync).
create function public.dispatch_due_mail_sync() returns integer
language plpgsql security invoker set search_path = ''
as $$
declare
  endpoint text;
  dispatched integer;
begin
  select decrypted_secret into endpoint from vault.decrypted_secrets where name = 'buddy_mail_functions_url';
  if endpoint is null then
    raise exception 'Set buddy_mail_functions_url in Vault before scheduling mail sync';
  end if;

  with due as (
    select i.id
    from public.integrations i left join public.mail_sync_state s on s.integration_id = i.id
    where i.status in ('active', 'connected') and i.capabilities @> array['mail']::text[]
      and i.provider in ('google', 'microsoft')
      and coalesce(s.next_attempt_at, '-infinity'::timestamptz) <= now()
      and coalesce(s.lease_until, '-infinity'::timestamptz) <= now()
    order by s.next_attempt_at nulls first, i.id
    limit 16
  ), queued as (
    insert into public.mail_sync_state as s (integration_id, dispatch_ticket, next_attempt_at)
    select id, gen_random_uuid(), now() + interval '2 minutes' from due
    on conflict (integration_id) do update
      set dispatch_ticket = excluded.dispatch_ticket, next_attempt_at = excluded.next_attempt_at
      where s.next_attempt_at <= now() and coalesce(s.lease_until, '-infinity'::timestamptz) <= now()
    returning integration_id, dispatch_ticket
  )
  select count(net.http_post(url := endpoint,
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object('action', 'scheduled', 'integration_id', integration_id, 'ticket', dispatch_ticket),
    timeout_milliseconds := 90000)) into dispatched from queued;
  return dispatched;
end;
$$;
revoke all on function public.dispatch_due_mail_sync() from public, anon, authenticated, service_role;

-- Resolve the owner inside the transaction. A disconnect or an expired lease stops
-- an in-flight download before it can put messages back into a disconnected account.
create function public.store_imported_mail(p_integration_id uuid, p_lease_id uuid, p_messages jsonb)
returns integer language plpgsql security invoker set search_path = ''
as $$
declare
  owner_id uuid;
  inserted integer;
begin
  select i.user_id into strict owner_id
  from public.integrations i join public.mail_sync_state s on s.integration_id = i.id
  where i.id = p_integration_id and i.status in ('active', 'connected') and i.capabilities @> array['mail']::text[]
    and i.connected_at is not distinct from s.connection_started_at
    and s.lease_id = p_lease_id and s.lease_until > now()
  for share of i, s;

  insert into public.mail_messages (user_id, integration_id, external_id, folder, subject, body,
    actions, snippet, from_address, recipients, is_read, is_starred, is_draft, received_at)
  select owner_id, p_integration_id, m.external_id, m.folder, m.subject, m.body, m.actions,
    m.snippet, m.from_address, m.recipients, m.is_read, m.is_starred, m.is_draft, m.received_at
  from jsonb_to_recordset(p_messages) as m(external_id text, folder text, subject text, body text,
    actions jsonb, snippet text, from_address text, recipients jsonb, is_read boolean,
    is_starred boolean, is_draft boolean, received_at timestamptz)
  on conflict (user_id, integration_id, external_id) do nothing;
  get diagnostics inserted = row_count;
  return inserted;
end;
$$;
revoke all on function public.store_imported_mail(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.store_imported_mail(uuid,uuid,jsonb) to service_role;

-- Save the page and release its lease together. Calendar shares integrations.sync_state,
-- so merge the timestamps in SQL instead of writing back an old copy of the whole object.
create function public.finish_mail_sync(
  p_integration_id uuid, p_lease_id uuid, p_synced_through timestamptz,
  p_window_end timestamptz, p_page_cursor text, p_error_code text
) returns boolean
language plpgsql security invoker set search_path = ''
as $$
begin
  update public.mail_sync_state s set
    synced_through = case when p_error_code is null then p_synced_through else s.synced_through end,
    window_end = case when p_error_code is null then p_window_end else s.window_end end,
    page_cursor = case when p_error_code is null or p_error_code = 'CURSOR_EXPIRED' then p_page_cursor else s.page_cursor end,
    next_attempt_at = case when p_error_code is null then now() else now() + interval '3 minutes' end,
    last_success_at = case when p_error_code is null and p_page_cursor is null then now() else s.last_success_at end,
    last_error_code = p_error_code, lease_id = null, lease_until = null
  where s.integration_id = p_integration_id and s.lease_id = p_lease_id;
  if not found then return false; end if;

  update public.integrations i set sync_state =
    coalesce(i.sync_state, '{}'::jsonb) || jsonb_build_object('last_attempted_sync_at', now()) ||
    case when p_error_code is null and p_page_cursor is null
      then jsonb_build_object('last_successful_sync_at', now()) else '{}'::jsonb end
  where i.id = p_integration_id and i.status in ('active', 'connected');
  return true;
end;
$$;
revoke all on function public.finish_mail_sync(uuid,uuid,timestamptz,timestamptz,text,text) from public, anon, authenticated;
grant execute on function public.finish_mail_sync(uuid,uuid,timestamptz,timestamptz,text,text) to service_role;

select cron.schedule('buddy-mail-sync', '* * * * *', 'select public.dispatch_due_mail_sync()');
