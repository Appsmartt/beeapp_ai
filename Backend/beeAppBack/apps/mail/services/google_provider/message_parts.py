"""Gmail message body and attachment extraction helpers."""

from __future__ import annotations

import base64
from typing import Any

from apps.mail.services.mail_provider_service import (
    normalize_mail_body_text,
)


class GmailMessageParts:
    def decode_base64url(
        self,
        value: str | None,
    ) -> str:
        if not value:
            return ""

        try:
            padding = "=" * (-len(value) % 4)
            decoded = base64.urlsafe_b64decode(
                f"{value}{padding}"
            )
            return decoded.decode(
                "utf-8",
                errors="replace",
            )
        except Exception:
            return ""

    def extract_bodies(
        self,
        payload: dict[str, Any],
    ) -> tuple[str | None, str | None]:
        text_parts: list[str] = []
        html_parts: list[str] = []

        def walk(part: dict[str, Any]) -> None:
            mime_type = str(
                part.get("mimeType") or ""
            ).lower()

            body = part.get("body")

            if not isinstance(body, dict):
                body = {}

            data = body.get("data")

            if mime_type == "text/plain" and data:
                decoded = self.decode_base64url(data)

                if decoded:
                    text_parts.append(decoded)

            elif mime_type == "text/html" and data:
                decoded = self.decode_base64url(data)

                if decoded:
                    html_parts.append(decoded)

            child_parts = part.get("parts")

            if isinstance(child_parts, list):
                for child in child_parts:
                    if isinstance(child, dict):
                        walk(child)

        walk(payload)

        normalized_text_parts = [
            normalized
            for part in text_parts
            if (
                normalized := normalize_mail_body_text(
                    part,
                )
            )
        ]
        body_text = normalize_mail_body_text(
            "\n".join(normalized_text_parts),
        )

        body_html = "\n".join(
            part.strip()
            for part in html_parts
            if part.strip()
        ) or None

        if not body_text and body_html:
            body_text = normalize_mail_body_text(
                self.html_to_text(body_html),
            )

        return body_text, body_html

    def extract_attachments(
        self,
        payload: dict[str, Any],
    ) -> list[dict[str, Any]]:
        attachments: list[dict[str, Any]] = []

        def walk(part: dict[str, Any]) -> None:
            filename = str(part.get("filename") or "").strip()

            body = part.get("body")

            if not isinstance(body, dict):
                body = {}

            attachment_id = str(
                body.get("attachmentId") or ""
            ).strip()

            if filename and attachment_id:
                content_disposition = self.header_value(
                    part.get("headers"),
                    "content-disposition",
                )

                attachments.append(
                    {
                        "provider_attachment_id": attachment_id,
                        "provider_message_attachment_id": (
                            attachment_id
                        ),
                        "filename": filename[:255],
                        "mime_type": (
                            str(
                                part.get("mimeType")
                                or "application/octet-stream"
                            ).strip()
                            or "application/octet-stream"
                        ),
                        "size_bytes": (
                            int(body.get("size"))
                            if str(
                                body.get("size") or ""
                            ).isdigit()
                            else None
                        ),
                        "content_id": self.header_value(
                            part.get("headers"),
                            "content-id",
                        ),
                        "content_disposition": content_disposition,
                        "is_inline": (
                            str(content_disposition or "")
                            .lower()
                            .startswith("inline")
                        ),
                        "metadata": {},
                    }
                )

            child_parts = part.get("parts")

            if isinstance(child_parts, list):
                for child in child_parts:
                    if isinstance(child, dict):
                        walk(child)

        walk(payload)

        return attachments

    def header_value(
        self,
        raw_headers: Any,
        wanted_name: str,
    ) -> str | None:
        if not isinstance(raw_headers, list):
            return None

        normalized_name = wanted_name.lower()

        for header in raw_headers:
            if not isinstance(header, dict):
                continue

            name = str(header.get("name") or "").lower()

            if name == normalized_name:
                value = str(header.get("value") or "").strip()
                return value or None

        return None

    def html_to_text(
        self,
        value: str,
    ) -> str:
        text = value

        for marker in (
            "<br>",
            "<br/>",
            "<br />",
            "</p>",
            "</div>",
            "</li>",
        ):
            text = text.replace(marker, "\n")

        result: list[str] = []
        inside_tag = False

        for character in text:
            if character == "<":
                inside_tag = True
                continue

            if character == ">":
                inside_tag = False
                continue

            if not inside_tag:
                result.append(character)

        normalized = "".join(result)

        return "\n".join(
            line.strip()
            for line in normalized.splitlines()
            if line.strip()
        )[:50_000]