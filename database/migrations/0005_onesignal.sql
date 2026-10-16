alter table public.devices
  add column if not exists onesignal_subscription_id text;

create index if not exists notifications_push_status_created_at_idx
  on public.notifications (push_status, created_at);

create or replace function public.claim_pending_push_notifications(p_limit integer default 20)
returns table (
  id uuid,
  user_id uuid,
  title text,
  body text,
  kind text,
  data jsonb
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  update public.notifications as notification
  set push_status = 'pending'
  from public.notification_campaigns as campaign
  where notification.campaign_id = campaign.id
    and notification.push_status = 'scheduled'
    and campaign.scheduled_for is not null
    and campaign.scheduled_for <= now();

  update public.notification_campaigns
  set
    status = 'sent',
    sent_at = coalesce(sent_at, now())
  where status = 'scheduled'
    and scheduled_for is not null
    and scheduled_for <= now();

  return query
  with picked as (
    select notification.id
    from public.notifications as notification
    where notification.push_status = 'pending'
    order by notification.created_at
    limit greatest(coalesce(p_limit, 20), 1)
    for update skip locked
  )
  update public.notifications as notification
  set push_status = 'sending'
  from picked
  where notification.id = picked.id
  returning
    notification.id,
    notification.user_id,
    notification.title,
    notification.body,
    notification.kind,
    notification.data;
end;
$$;

revoke all on function public.claim_pending_push_notifications(integer) from public;
revoke all on function public.claim_pending_push_notifications(integer) from anon, authenticated;
grant execute on function public.claim_pending_push_notifications(integer) to service_role;

-- El cron push-dispatch-every-minute vive en el proyecto alojado:
-- pg_cron llama a la Edge Function cada minuto con pg_net y la anon key pública.
-- Esa clave no se versiona en este archivo.
