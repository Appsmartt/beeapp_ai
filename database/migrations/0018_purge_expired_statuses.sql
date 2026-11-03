-- Borra estados con más de 24 horas, sus vistas y los archivos del bucket.

alter table public.statuses
  alter column expires_at set default (now() + interval '24 hours');

update public.statuses
set expires_at = created_at + interval '24 hours'
where expires_at is null;

create or replace function public.purge_expired_statuses()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  status_ids uuid[];
  file_ids uuid[];
  deleted_count integer := 0;
begin
  select coalesce(array_agg(status.id), '{}')
  into status_ids
  from public.statuses as status
  where coalesce(status.expires_at, status.created_at + interval '24 hours') <= now();

  if cardinality(status_ids) = 0 then
    return 0;
  end if;

  perform set_config('storage.allow_delete_query', 'true', true);

  select coalesce(array_agg(distinct ref.file_id), '{}')
  into file_ids
  from (
    select
      case
        when (item->>'file_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then (item->>'file_id')::uuid
        else null
      end as file_id
    from public.statuses as status
    cross join lateral (
      select status.media as item
      where jsonb_typeof(status.media) = 'object'
      union all
      select value
      from jsonb_array_elements(status.media) as value
      where jsonb_typeof(status.media) = 'array'
      union all
      select value
      from jsonb_array_elements(
        case
          when jsonb_typeof(status.layers) = 'array' then status.layers
          else '[]'::jsonb
        end
      ) as value
    ) as items(item)
    where status.id = any(status_ids)
      and jsonb_typeof(item) = 'object'
  ) as ref
  where ref.file_id is not null;

  delete from storage.objects as object
  using (
    select distinct
      coalesce(
        nullif(item->>'bucket_id', ''),
        nullif(item->>'bucket', ''),
        'beeapp-statuses'
      ) as bucket_id,
      coalesce(
        nullif(item->>'storage_path', ''),
        nullif(item->>'path', '')
      ) as storage_path
    from public.statuses as status
    cross join lateral (
      select status.media as item
      where jsonb_typeof(status.media) = 'object'
      union all
      select value
      from jsonb_array_elements(status.media) as value
      where jsonb_typeof(status.media) = 'array'
      union all
      select value
      from jsonb_array_elements(
        case
          when jsonb_typeof(status.layers) = 'array' then status.layers
          else '[]'::jsonb
        end
      ) as value
    ) as items(item)
    where status.id = any(status_ids)
      and jsonb_typeof(item) = 'object'
    union
    select file.bucket, file.path
    from public.files as file
    where file.id = any(file_ids)
      and file.bucket = 'beeapp-statuses'
      and file.path is not null
  ) as target
  where object.bucket_id = target.bucket_id
    and object.name = target.storage_path
    and target.storage_path is not null;

  delete from public.files as file
  where file.id = any(file_ids)
    and file.bucket = 'beeapp-statuses'
    and 'system:status' = any(file.tags);

  delete from public.statuses as status
  where status.id = any(status_ids);

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_expired_statuses() from public;
revoke all on function public.purge_expired_statuses() from anon;
grant execute on function public.purge_expired_statuses() to authenticated, service_role;

do $$
declare
  existing_job bigint;
begin
  select job.jobid
  into existing_job
  from cron.job as job
  where job.jobname = 'beeapp-purge-expired-statuses';

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
end $$;

select cron.schedule(
  'beeapp-purge-expired-statuses',
  '*/15 * * * *',
  'select public.purge_expired_statuses();'
);

select public.purge_expired_statuses();
