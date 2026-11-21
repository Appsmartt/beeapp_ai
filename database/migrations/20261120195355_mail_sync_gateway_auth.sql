-- Keep JWT verification enabled at the Edge gateway. The anonymous JWT only passes
-- that gateway; the one-time ticket still authorizes one mailbox import.
create or replace function public.dispatch_due_mail_sync() returns integer
language plpgsql security invoker set search_path = ''
as $$
declare
  endpoint text;
  anon_jwt text;
  dispatched integer;
begin
  select decrypted_secret into endpoint from vault.decrypted_secrets where name = 'buddy_mail_functions_url';
  select decrypted_secret into anon_jwt from vault.decrypted_secrets where name = 'buddy_mail_anon_jwt';
  if endpoint is null or anon_jwt is null then
    raise exception 'Configure buddy_mail_functions_url and buddy_mail_anon_jwt in Vault';
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
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || anon_jwt, 'apikey', anon_jwt),
    body := jsonb_build_object('action', 'scheduled', 'integration_id', integration_id, 'ticket', dispatch_ticket),
    timeout_milliseconds := 90000)) into dispatched from queued;
  return dispatched;
end;
$$;
revoke all on function public.dispatch_due_mail_sync() from public, anon, authenticated, service_role;
