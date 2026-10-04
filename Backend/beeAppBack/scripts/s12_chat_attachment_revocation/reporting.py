import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
REPORT_DIRECTORY = ROOT / "tmp"
CYCLE_COUNT = 10


def write_report(results):
    REPORT_DIRECTORY.mkdir(exist_ok=True)

    report_path = REPORT_DIRECTORY / (
        "s12_chat_attachment_revocation_exhaustive_"
        + datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        + ".txt"
    )

    ignored = subprocess.run(
        [
            "git",
            "-C",
            str(ROOT),
            "check-ignore",
            "-q",
            str(report_path),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )

    if ignored.returncode != 0:
        raise RuntimeError("REPORT_DIRECTORY_NOT_IGNORED")

    descriptor = os.open(
        report_path,
        os.O_WRONLY | os.O_CREAT | os.O_EXCL,
        0o600,
    )

    with os.fdopen(descriptor, "w", encoding="utf-8") as output:
        output.write(
            "S12 exhaustive chat attachment revocation report\n"
        )
        output.write(
            "Generated UTC: "
            + datetime.now(timezone.utc).isoformat()
            + "\n"
        )
        output.write(
            "Cycles per departure mode: "
            + str(CYCLE_COUNT)
            + "\n\n"
        )
        output.write("\n".join(results) + "\n")

    if report_path.stat().st_size <= 0:
        raise RuntimeError("REPORT_EMPTY")

    return report_path
