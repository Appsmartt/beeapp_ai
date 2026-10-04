import argparse
import getpass
import json
import urllib.error

from .auth_helpers import get_profile_identity, json_request, login
from .departure_scenarios import append_result, run_departure_cycle
from .group_cleanup import deactivate_group
from .reporting import write_report
from .runtime_config import configure_backend_url, load_frontend_config


def parse_arguments():
    parser = argparse.ArgumentParser(
        description="Run S12 chat attachment revocation HTTP checks."
    )
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument(
        "--preflight",
        action="store_true",
        help="Validate configuration and backend health without test data.",
    )
    mode.add_argument(
        "--run",
        action="store_true",
        help="Run exhaustive cycles using two distinct test accounts.",
    )
    parser.add_argument(
        "--base-url",
        help="Temporary backend base URL; it is never persisted.",
    )
    return parser.parse_args()


def verify_backend_health():
    status, payload = json_request("GET", "/api/health/", None)
    if (
        status != 200
        or not isinstance(payload, dict)
        or payload.get("status") != "ok"
    ):
        raise RuntimeError("BACKEND_NOT_HEALTHY")


def run_exhaustive_cycles(supabase_url, public_key, results):
    created_groups = []
    owner_token = None
    owner_identity_id = None

    try:
        owner_email = input("Owner account email: ").strip()
        owner_password = getpass.getpass("Owner account password: ")
        owner_token, owner_user_id = login(owner_email, owner_password)
        del owner_email, owner_password

        member_email = input("Member account email: ").strip()
        member_password = getpass.getpass("Member account password: ")
        member_token, member_user_id = login(member_email, member_password)
        del member_email, member_password

        if owner_user_id == member_user_id:
            raise RuntimeError("DISTINCT_TEST_ACCOUNTS_REQUIRED")

        owner_identity_id = get_profile_identity(owner_token)
        member_identity_id = get_profile_identity(member_token)
        append_result(
            results,
            "precondition",
            "two distinct active profile identities",
        )

        for departure_kind in ("leave", "removal"):
            for cycle_number in range(1, 10 + 1):
                run_departure_cycle(
                    departure_kind,
                    cycle_number,
                    supabase_url,
                    public_key,
                    owner_token,
                    owner_user_id,
                    owner_identity_id,
                    member_token,
                    member_user_id,
                    member_identity_id,
                    results,
                    created_groups,
                )
    finally:
        if owner_token and owner_identity_id:
            for conversation_id in reversed(created_groups):
                try:
                    deactivate_group(
                        owner_token,
                        conversation_id,
                        owner_identity_id,
                    )
                except Exception as error:
                    results.append(
                        "FAIL | cleanup | "
                        + type(error).__name__
                        + " | conversation_id="
                        + conversation_id
                        + " | "
                        + str(error)
                    )


def main():
    arguments = parse_arguments()
    mode = "run" if arguments.run else "preflight"
    results = []

    try:
        configure_backend_url(arguments.base_url)
        supabase_url, public_key = load_frontend_config()
        append_result(results, "precondition", "frontend configuration")

        verify_backend_health()
        append_result(results, "precondition", "backend health")

        if arguments.run:
            run_exhaustive_cycles(supabase_url, public_key, results)
    except (
        RuntimeError,
        ValueError,
        KeyError,
        UnicodeDecodeError,
        json.JSONDecodeError,
        urllib.error.URLError,
        TimeoutError,
    ) as error:
        results.append(
            "FAIL | execution | "
            + type(error).__name__
            + " | "
            + str(error)
        )

    report_path = write_report(results, mode)
    failures = sum(
        1 for result in results
        if not result.startswith("PASS |")
    )
    print(
        "S12 " + mode + " result: "
        + str(len(results) - failures)
        + " passed; "
        + str(failures)
        + " failed. Report: "
        + str(report_path)
    )
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
