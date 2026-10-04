#!/usr/bin/env python3
import sys
from pathlib import Path

SCRIPT_DIRECTORY = Path(__file__).resolve().parent
if str(SCRIPT_DIRECTORY) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIRECTORY))

from authentication import authenticate_accounts
from backend_regressions import (
    verify_backend_regressions,
    verify_temporary_note_isolation,
)
from chat_fixture import verify_autonomous_chat_fixture
from config import resolve_runtime_config
from http_client import request
from identity_and_rls import load_account_rls_data
from reporting import TestReporter


def main():
    reporter = TestReporter()
    runtime_config = resolve_runtime_config(reporter)
    if not runtime_config:
        return reporter.exit_code, reporter

    key_status, _ = request(
        "GET",
        runtime_config["supabase_url"] + "/auth/v1/settings",
        {"apikey": runtime_config["anon_key"]},
    )
    reporter.check(
        "clave pública de prueba aceptada",
        key_status == 200,
        f"HTTP {key_status}",
    )
    if key_status != 200:
        return reporter.exit_code, reporter

    accounts = authenticate_accounts(runtime_config, reporter)
    if not accounts:
        return reporter.exit_code, reporter

    load_account_rls_data(runtime_config, accounts, reporter)
    verify_backend_regressions(runtime_config, accounts, reporter)
    verify_autonomous_chat_fixture(runtime_config, accounts, reporter)
    verify_temporary_note_isolation(runtime_config, accounts, reporter)
    return reporter.exit_code, reporter


if __name__ == "__main__":
    try:
        exit_code, reporter = main()
    except Exception as error:
        reporter = TestReporter()
        reporter.fail("ejecución", type(error).__name__)
        exit_code = reporter.exit_code
    print(reporter.output())
    sys.exit(exit_code)
