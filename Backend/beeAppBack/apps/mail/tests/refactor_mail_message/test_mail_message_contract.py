from __future__ import annotations

import inspect
import unittest

from apps.mail.services import mail_message


EXPECTED_SIGNATURES = {
    "list_mail_messages": (
        "user_id",
        "integration_id",
        "folder",
        "unread_only",
        "starred_only",
        "search",
        "limit",
        "offset",
    ),
    "get_mail_message": (
        "user_id",
        "message_id",
    ),
    "update_mail_message_state": (
        "user_id",
        "message_id",
        "is_read",
        "is_starred",
    ),
    "move_mail_message": (
        "user_id",
        "message_id",
        "folder",
    ),
}


class MailMessagePublicContractTests(unittest.TestCase):
    def test_public_exports_match_expected_contract(self) -> None:
        self.assertEqual(
            set(mail_message.__all__),
            set(EXPECTED_SIGNATURES),
        )

    def test_public_signatures_match_expected_contract(self) -> None:
        for function_name, parameter_names in (
            EXPECTED_SIGNATURES.items()
        ):
            function = getattr(mail_message, function_name)
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
