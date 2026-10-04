from pathlib import Path


SERVICES_DIRECTORY = (
    Path(__file__).resolve().parents[1] / "services"
)
CALL_SESSION_DIRECTORY = SERVICES_DIRECTORY / "call_session"


def test_call_session_modules_are_present():
    expected_files = {
        "__init__.py",
        "validation_service.py",
        "repository_service.py",
        "identity_service.py",
        "credentials_service.py",
    }

    assert CALL_SESSION_DIRECTORY.is_dir()

    existing_files = {
        path.name
        for path in CALL_SESSION_DIRECTORY.iterdir()
        if path.is_file()
    }

    assert expected_files <= existing_files


def test_call_session_modules_stay_under_limit():
    for module_path in CALL_SESSION_DIRECTORY.glob("*.py"):
        assert len(
            module_path.read_text(encoding="utf-8").splitlines()
        ) <= 400
