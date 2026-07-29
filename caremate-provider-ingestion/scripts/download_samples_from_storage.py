#!/usr/bin/env python3
"""Download canonical sample workbooks from shared Storage into samples/."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.samples_sync import SamplesMissingError, ensure_local_samples  # noqa: E402
from app.settings import get_settings  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download even when local files already exist",
    )
    args = parser.parse_args()
    settings = get_settings()
    try:
        directory = ensure_local_samples(settings, force_download=args.force)
    except SamplesMissingError as exc:
        raise SystemExit(str(exc)) from exc
    print(f"samples ready under {directory.resolve()}")


if __name__ == "__main__":
    main()
