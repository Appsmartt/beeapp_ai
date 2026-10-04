#!/usr/bin/env python3
from __future__ import annotations

import getpass
from typing import Any

from .auth_helpers import AuthenticatedAccount, login_account
from .fixture_lifecycle import (
    assert_fixture_safe,
    create_malicious_fixture,
    delete_fixture_or_raise,
)
from .profile_repository import fetch_profile_template, list_owner_profiles
from .reporting import create_report_lines, ignored_report_directory, write_report
from .runtime_config import ROOT, load_runtime_config
from .security_cases import (
    assert_cross_account_isolation,
    assert_ordinary_update,
    baseline_for,
    run_fixture_protected_cycles,
    run_owner_protected_cycles,
)


def require_rows(status: int, rows: Any, message: str) -> list[dict[str, Any]]:
    if status != 200 or not isinstance(rows, list):
        raise RuntimeError(message)
    return [row for row in rows if isinstance(row, dict)]


def request_account(
    label: str,
    config: Any,
    lines: list[str],
) -> AuthenticatedAccount:
    email = input(f"Email for test account {label}: ").strip()
    password = getpass.getpass(
        f"Password for test account {label} (not stored): "
    )
    account = login_account(config, email, password)
    lines.append(f"BeeApp login for account {label}: HTTP 200")
    lines.append(
        f"Account {label} token and device session: present (values omitted)"
    )
    return account


def main() -> int:
    report = ignored_report_directory(ROOT) / "s8_pruebas_comerciales.txt"
    lines = create_report_lines()
    result = 1
    stage = "runtime configuration"
    fixture_id: str | None = None
    fixture_owner: AuthenticatedAccount | None = None
    config: Any = None
    try:
        config = load_runtime_config()
        lines.append("Configured schemes: backend and Supabase validated")
        stage = "account A authentication"
        account_a = request_account("A", config, lines)
        stage = "account A RLS read"
        status, rows = list_owner_profiles(
            config, account_a.token, account_a.user_id
        )
        profiles_a = require_rows(
            status,
            rows,
            "RLS read for account A was not confirmed.",
        )
        lines.append(f"Account A visible profiles: {len(profiles_a)}")
        lines.append(
            "Account A profile IDs: "
            + (", ".join(str(row["id"]) for row in profiles_a) or "(none)")
        )
        if not profiles_a:
            raise RuntimeError("Account A has no commercial profiles.")
        stage = "ordinary update regression"
        assert_ordinary_update(
            config,
            account_a.token,
            account_a.user_id,
            profiles_a[0],
        )
        lines.append(
            "Ordinary is_available update without value change: HTTP 200"
        )
        stage = "account A protected-field cycles"
        baseline_a = baseline_for(profiles_a)
        rejected_a = run_owner_protected_cycles(
            config,
            account_a.token,
            account_a.user_id,
            baseline_a,
            lines,
            "Account A",
        )
        lines.append(f"Account A protected rejections: {rejected_a}")
        stage = "account B authentication"
        account_b = request_account("B", config, lines)
        if account_b.user_id == account_a.user_id:
            raise RuntimeError("Account B must differ from account A.")
        stage = "account B RLS read"
        status, rows = list_owner_profiles(
            config, account_b.token, account_b.user_id
        )
        profiles_b = require_rows(
            status,
            rows,
            "RLS read for account B was not confirmed.",
        )
        lines.append(f"Account B preexisting profiles: {len(profiles_b)}")
        if profiles_b:
            raise RuntimeError(
                "Account B already has profiles; fixture creation is blocked."
            )
        stage = "account A template read"
        first_profile_id = str(profiles_a[0]["id"])
        status, rows = fetch_profile_template(
            config,
            account_a.token,
            first_profile_id,
        )
        template_rows = require_rows(
            status,
            rows,
            "Reference commercial profile template was not available.",
        )
        if len(template_rows) != 1:
            raise RuntimeError("Reference template did not return one row.")
        stage = "account B fixture creation"
        fixture_owner = account_b
        creation = create_malicious_fixture(
            config,
            account_b.token,
            account_b.user_id,
            template_rows[0]["offer_type"],
            template_rows[0]["country_code"],
        )
        fixture_id = creation.fixture_id
        assert_fixture_safe(creation)
        lines.append("Account B malicious INSERT: protected fields normalized")
        stage = "account B protected-field cycles"
        rejected_b = run_fixture_protected_cycles(
            config,
            account_b.token,
            account_b.user_id,
            fixture_id,
            lines,
        )
        stage = "cross-account isolation"
        assert_cross_account_isolation(
            config,
            account_a.token,
            first_profile_id,
            account_b.token,
            fixture_id,
            lines,
        )
        stage = "account A final verification"
        status, rows = list_owner_profiles(
            config, account_a.token, account_a.user_id
        )
        final_profiles_a = require_rows(
            status,
            rows,
            "Final account A verification was not available.",
        )
        if baseline_for(final_profiles_a) != baseline_a:
            raise RuntimeError("Account A protected values changed.")
        expected_rejections = len(baseline_a) * 4 * 5 + 4 * 5
        if rejected_a + rejected_b != expected_rejections:
            raise RuntimeError("S8 rejection count does not match.")
        result = 0
    except Exception as error:
        lines.append(f"RESULT: BLOCKED at {stage} — {type(error).__name__}")
        lines.append("Exception details omitted to avoid exposing secrets.")
    finally:
        if fixture_id and fixture_owner and config:
            cleanup_stage = "account B fixture cleanup"
            try:
                delete_fixture_or_raise(
                    config,
                    fixture_owner.token,
                    fixture_id,
                    fixture_owner.user_id,
                )
                lines.append("Account B fixture cleanup: confirmed")
                if result == 0:
                    lines.append(
                        f"RESULT: PASSED INSERT, "
                        f"{rejected_a + rejected_b} rejections, "
                        "isolation and cleanup"
                    )
            except Exception as error:
                result = 1
                lines.append(
                    f"RESULT: BLOCKED at {cleanup_stage} — "
                    f"{type(error).__name__}"
                )
                lines.append("Cleanup details omitted to avoid exposing secrets.")
        write_report(report, lines)
        print(f"Report: {report}")
    return result


if __name__ == "__main__":
    if main() != 0:
        raise RuntimeError("S8 test failed; inspect the TXT report.")
