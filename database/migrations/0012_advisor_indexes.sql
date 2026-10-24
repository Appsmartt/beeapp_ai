-- Índices que cubren llaves foráneas y cierre de funciones internas al rol anónimo.

create index if not exists qr_logins_approved_by_idx
    on public.qr_logins (approved_by);

create index if not exists chat_category_assignments_conversation_id_idx
    on public.chat_category_assignments (conversation_id);

revoke all on function public.is_admin() from anon;
revoke all on function public.is_blocked(uuid, uuid) from anon;
revoke all on function public.is_conversation_member(uuid) from anon;
revoke all on function public.owns_business(uuid) from anon;
