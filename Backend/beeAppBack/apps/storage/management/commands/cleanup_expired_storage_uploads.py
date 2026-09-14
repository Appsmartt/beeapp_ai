from django.core.management.base import BaseCommand

from beeAppBack.core.supabase_client import get_supabase_admin_client


class Command(BaseCommand):
    help = (
        "Remove physical Storage objects and logical file records "
        "for expired or failed uploads."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=100,
            help="Maximum failed uploads to process.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="List candidates without deleting objects or records.",
        )

    def handle(self, *args, **options):
        limit = max(1, min(int(options["limit"]), 500))
        dry_run = bool(options["dry_run"])
        supabase = get_supabase_admin_client()

        response = (
            supabase.table("storage_uploads")
            .select(
                "id,file_id,owner_id,status,"
                "files!inner(id,bucket_id,storage_path,status)"
            )
            .in_("status", ["expired", "failed"])
            .eq("files.status", "failed")
            .order("updated_at")
            .limit(limit)
            .execute()
        )

        uploads = response.data or []
        deleted_objects = 0
        deleted_files = 0
        failed = 0

        self.stdout.write(
            f"candidates={len(uploads)} dry_run={dry_run}"
        )

        for upload in uploads:
            file_record = upload.get("files") or {}
            file_id = str(file_record.get("id") or "").strip()
            bucket_id = str(
                file_record.get("bucket_id") or ""
            ).strip()
            storage_path = str(
                file_record.get("storage_path") or ""
            ).strip()

            if not file_id or not bucket_id or not storage_path:
                failed += 1
                self.stderr.write(
                    f"invalid_candidate upload_id={upload.get('id')}"
                )
                continue

            self.stdout.write(
                f"candidate upload_id={upload.get('id')} "
                f"file_id={file_id} bucket_id={bucket_id} "
                f"storage_path={storage_path}"
            )

            if dry_run:
                continue

            try:
                try:
                    supabase.storage.from_(bucket_id).remove(
                        [storage_path],
                    )
                    deleted_objects += 1
                except Exception as storage_error:
                    self.stderr.write(
                        f"storage_remove_warning file_id={file_id} "
                        f"error={storage_error}"
                    )

                delete_response = (
                    supabase.table("files")
                    .delete()
                    .eq("id", file_id)
                    .eq("status", "failed")
                    .execute()
                )

                if delete_response.data:
                    deleted_files += 1
                else:
                    failed += 1
                    self.stderr.write(
                        f"file_delete_failed file_id={file_id}"
                    )

            except Exception as error:
                failed += 1
                self.stderr.write(
                    f"cleanup_failed file_id={file_id} error={error}"
                )

        self.stdout.write(
            self.style.SUCCESS(
                "cleanup_complete "
                f"candidates={len(uploads)} "
                f"deleted_objects={deleted_objects} "
                f"deleted_files={deleted_files} "
                f"failed={failed}"
            )
        )
