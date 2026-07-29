#!/usr/bin/env python3
"""Upload local samples/*.xlsx to shared Supabase Storage (provider-ingest/samples/)."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.samples_sync import (  # noqa: E402
    CANONICAL_SAMPLE_FILES,
    SamplesMissingError,
    publish_local_samples_to_storage,
)
from app.settings import get_settings  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--files",
        nargs="*",
        default=list(CANONICAL_SAMPLE_FILES),
        help="Filenames under samples/ to upload",
    )
    args = parser.parse_args()
    settings = get_settings()
    try:
        published = publish_local_samples_to_storage(settings, filenames=args.files)
    except SamplesMissingError as exc:
        raise SystemExit(str(exc)) from exc
    for path in published:
        print(f"uploaded {path}")


if __name__ == "__main__":
    main()
