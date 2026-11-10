-- Revisión de verificación de negocios desde el panel web.
-- La solicitud sigue viviendo en businesses.verification.

create or replace function public.admin_list_business_verifications(
  p_status text default ''
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_status text := nullif(btrim(coalesce(p_status, '')), '');
begin
  perform public.assert_admin();

  return coalesce((
    select jsonb_agg(item.payload)
    from (
      select jsonb_build_object(
        'id', b.id,
        'display_name', b.display_name,
        'city', b.city,
        'owner_id', b.owner_id,
        'owner_name', btrim(concat_ws(' ', p.first_name, p.last_name)),
        'owner_email', p.email,
        'verification_status', b.verification_status,
        'verification_badge_visible', b.verification_badge_visible,
        'applicant_type', b.verification ->> 'applicant_type',
        'legal_name', b.verification ->> 'legal_name',
        'tax_id', b.verification ->> 'tax_id',
        'business_address', b.verification ->> 'business_address',
        'review_note', b.verification ->> 'review_note',
        'review_reason_text', b.verification ->> 'review_reason_text',
        'submitted_at', b.verification ->> 'submitted_at',
        'reviewed_at', b.verification ->> 'reviewed_at',
        'document_file_id', b.verification #>> '{document,file_id}',
        'document_name', f.name,
        'document_bucket', f.bucket,
        'document_path', f.path
      ) as payload
      from public.businesses b
      join public.profiles p on p.id = b.owner_id
      left join public.files f
        on f.id::text = b.verification #>> '{document,file_id}'
      where b.verification_status is distinct from 'not_requested'
        and (v_status is null or b.verification_status = v_status)
      order by coalesce(b.verification ->> 'submitted_at', b.updated_at::text) desc
    ) item
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_review_business_verification(
  p_business_id uuid,
  p_decision text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_status text;
  v_badge boolean;
  v_editable boolean;
  v_verification jsonb;
begin
  perform public.assert_admin();

  if p_decision not in ('approve', 'reject', 'request_correction', 'revoke') then
    raise exception 'Decisión no válida';
  end if;

  if p_decision in ('reject', 'request_correction') and v_reason is null then
    raise exception 'Escribe un comentario para el dueño del negocio';
  end if;

  select * into v_business
  from public.businesses
  where id = p_business_id;

  if v_business.id is null then
    raise exception 'No encontramos el negocio';
  end if;

  v_status := case p_decision
    when 'approve' then 'verified'
    when 'reject' then 'rejected'
    when 'request_correction' then 'requires_correction'
    else 'suspended'
  end;
  v_badge := p_decision = 'approve';
  v_editable := p_decision in ('reject', 'request_correction');
  v_verification := coalesce(v_business.verification, '{}'::jsonb) || jsonb_build_object(
    'status', v_status,
    'is_editable', v_editable,
    'reviewed_at', now(),
    'review_reason_text', case when p_decision = 'approve' then null else v_reason end,
    'updated_at', now()
  );

  update public.businesses
  set
    verification = v_verification,
    verification_status = v_status,
    verification_badge_visible = v_badge,
    updated_at = now()
  where id = p_business_id;

  return jsonb_build_object(
    'id', p_business_id,
    'verification_status', v_status,
    'verification_badge_visible', v_badge,
    'review_reason_text', v_verification ->> 'review_reason_text'
  );
end;
$$;

revoke all on function public.admin_list_business_verifications(text) from public, anon;
revoke all on function public.admin_review_business_verification(uuid, text, text) from public, anon;
grant execute on function public.admin_list_business_verifications(text) to authenticated;
grant execute on function public.admin_review_business_verification(uuid, text, text) to authenticated;

-- El panel web no registra un dispositivo móvil. Sin este ajuste, la política
-- restrictiva impide que el admin abra el PDF aunque tenga permiso de lectura.
drop policy if exists device_required on storage.objects;
create policy device_required on storage.objects
  as restrictive for all to authenticated
  using (public.has_active_device() or public.is_admin())
  with check (public.has_active_device() or public.is_admin());

drop policy if exists files_admin_read on storage.objects;
create policy files_admin_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'beeapp-files'
    and public.is_admin()
  );
