from __future__ import annotations

import subprocess
from datetime import datetime, timezone
from pathlib import Path


def ignored_report_directory(root: Path) -> Path:
    for relative_path in ("tmp/explorations", ".beeapp-work", "tmp"):
        directory = root / relative_path
        if directory.is_dir() and subprocess.run(
            ["git", "check-ignore", "-q", relative_path],
            cwd=root,
            check=False,
        ).returncode == 0:
            return directory
    raise RuntimeError("No ignored directory exists for the report.")


def create_report_lines() -> list[str]:
    return [
        "S8 — commercial profile trust REST regression",
        f"UTC date: {datetime.now(timezone.utc).isoformat()}",
    ]


def write_report(report: Path, lines: list[str]) -> None:
    report.write_text("\n".join(lines) + "\n", encoding="utf-8")
