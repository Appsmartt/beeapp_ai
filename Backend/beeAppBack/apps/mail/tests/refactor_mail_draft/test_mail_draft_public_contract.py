from __future__ import annotations

import inspect
import unittest

from apps.mail.services import mail_draft


EXPECTED_SIGNATURES = {
    "create_mail_draft": (
        "user_id",
        "integration_id",
        "to_recipients",
        "cc_recipients",
        "bcc_recipients",
        "subject",
        "body",
        "body_content_type",
        "file_ids",
    ),
    "update_mail_draft": (
        "user_id",
        "message_id",
        "integration_id",
        "to_recipients",
        "cc_recipients",
        "bcc_recipients",
        "subject",
        "body",
        "body_content_type",
        "file_ids",
    ),
    "delete_mail_draft": (
        "user_id",
        "message_id",
    ),
    "send_mail_draft": (
        "user_id",
        "message_id",
    ),
}


class MailDraftPublicContractTests(unittest.TestCase):
    def test_public_exports_match_expected_contract(self) -> None:
        self.assertEqual(
            set(mail_draft.__all__),
            set(EXPECTED_SIGNATURES),
        )

    def test_public_function_signatures_match_expected_contract(self) -> None:
        for function_name, parameter_names in (
            EXPECTED_SIGNATURES.items()
        ):
            function = getattr(mail_draft, function_name)
            parameters = inspect.signature(function).parameters

            self.assertEqual(
                tuple(parameters),
                parameter_names,
                msg=function_name,
            )

            for parameter in parameters.values():
                self.assertEqual(
                    parameter.kind,
                    inspect.Parameter.KEYWORD_ONLY,
                    msg=f"{function_name}.{parameter.name}",
                )


if __name__ == "__main__":
    unittest.main()
