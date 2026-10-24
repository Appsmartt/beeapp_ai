#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
if str(REPOSITORY_ROOT) not in sys.path:
    sys.path.insert(0, str(REPOSITORY_ROOT))

from Backend.beeAppBack.scripts.commercial_profile_trust.run_exhaustive_http import (
    main,
)


if __name__ == "__main__":
    if main() != 0:
        raise RuntimeError("S8 test failed; inspect the TXT report.")
