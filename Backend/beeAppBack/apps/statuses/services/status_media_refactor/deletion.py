from beeAppBack.core.supabase_client import get_supabase_admin_client


def delete_status_media_object_safely(
    *,
    bucket_id: str,
    storage_path: str,
) -> None:
    if not bucket_id or not storage_path:
        return

    try:
        (
            get_supabase_admin_client()
            .storage.from_(bucket_id)
            .remove([storage_path])
        )
    except Exception:
        return
