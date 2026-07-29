#!/usr/bin/env python3
"""Rebuild cleaned workbooks (with UUID `id` columns) from a prior chain run.

Leaves `runs/.../originals` untouched. Overwrites that run's `cleaned/` and
optionally refreshes `samples/ng_provider_*.xlsx` as the next ingest source.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.excel_json import reference_id  # noqa: E402
from app.keys import location_temp_keys, organization_temp_keys, resolve_mapped_id, slugify  # noqa: E402
from app.parsers.resource_xlsx import iter_resource_xlsx_rows  # noqa: E402
from app.run_storage import save_bytes  # noqa: E402
from app.workbook_writeback import (  # noqa: E402
    apply_cell_updates,
    location_reference,
    organization_reference,
)


def _resolve(raw: str | None, mapping: dict[str, str]) -> str | None:
    resolved = resolve_mapped_id(raw, mapping)
    if resolved:
        return resolved
    if raw:
        return resolve_mapped_id(slugify(raw), mapping)
    return None


def rebuild(run_dir: Path, *, update_samples: bool) -> None:
    manifest = json.loads((run_dir / "manifest.json").read_text(encoding="utf-8"))
    org_map: dict[str, str] = dict(manifest.get("organization_key_map") or {})
    loc_map: dict[str, str] = dict(manifest.get("location_key_map") or {})
    run_id = manifest.get("run_id") or run_dir.name
    originals = run_dir / "originals"
    cleaned = run_dir / "cleaned"
    cleaned.mkdir(parents=True, exist_ok=True)

    org_path = next((p for p in originals.iterdir() if "organization" in p.name.lower()), None)
    loc_path = next(
        (
            p
            for p in originals.iterdir()
            if "location" in p.name.lower() and "healthcare" not in p.name.lower()
        ),
        None,
    )
    hs_path = next((p for p in originals.iterdir() if "healthcare" in p.name.lower()), None)
    if not org_path:
        raise SystemExit(f"No organization workbook in {originals}")

    org_bytes = org_path.read_bytes()
    org_rows = iter_resource_xlsx_rows(org_bytes)
    org_updates = []
    for row in org_rows:
        uuid = None
        for key in organization_temp_keys(row):
            uuid = org_map.get(key)
            if uuid:
                break
        if not uuid:
            continue
        org_updates.append({"sheet": row["_sheet"], "row": row["_row"], "values": {"id": uuid}})
    cleaned_org = apply_cell_updates(org_bytes, org_updates)
    org_out = cleaned / f"organization-{run_id}.xlsx"
    save_bytes(org_out, cleaned_org)
    print(f"org updates={len(org_updates)} → {org_out}")

    loc_out = None
    if loc_path:
        loc_bytes = loc_path.read_bytes()
        loc_rows = iter_resource_xlsx_rows(loc_bytes)
        loc_updates = []
        for row in loc_rows:
            loc_uuid = None
            for key in location_temp_keys(row):
                loc_uuid = loc_map.get(key)
                if loc_uuid:
                    break
            raw_org = reference_id(row.get("managingOrganization"), "Organization")
            org_uuid = _resolve(raw_org, org_map)
            values: dict = {}
            if loc_uuid:
                values["id"] = loc_uuid
            if org_uuid:
                values["managingOrganization"] = organization_reference(org_uuid)
            if values:
                loc_updates.append(
                    {"sheet": row["_sheet"], "row": row["_row"], "values": values}
                )
        cleaned_loc = apply_cell_updates(loc_bytes, loc_updates)
        loc_out = cleaned / f"location-{run_id}.xlsx"
        save_bytes(loc_out, cleaned_loc)
        print(f"loc updates={len(loc_updates)} → {loc_out}")

    hs_out = None
    if hs_path:
        hs_bytes = hs_path.read_bytes()
        hs_rows = iter_resource_xlsx_rows(hs_bytes)
        hs_updates = []
        for row in hs_rows:
            raw_loc = reference_id(row.get("location"), "Location")
            loc_uuid = _resolve(raw_loc, loc_map)
            if not loc_uuid:
                continue
            hs_updates.append(
                {
                    "sheet": row["_sheet"],
                    "row": row["_row"],
                    "values": {"location": location_reference(loc_uuid)},
                }
            )
        cleaned_hs = apply_cell_updates(hs_bytes, hs_updates)
        hs_out = cleaned / f"healthcareservice-{run_id}.xlsx"
        save_bytes(hs_out, cleaned_hs)
        print(f"hs updates={len(hs_updates)} → {hs_out}")

    if update_samples:
        samples = ROOT / "samples"
        save_bytes(samples / "ng_provider_organization.xlsx", cleaned_org)
        if loc_out:
            save_bytes(samples / "ng_provider_location.xlsx", loc_out.read_bytes())
        if hs_out:
            save_bytes(samples / "ng_provider_healthcareservice.xlsx", hs_out.read_bytes())
        print(f"samples refreshed from run {run_id}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--run-dir",
        type=Path,
        default=ROOT / "runs" / "dev" / "20260729-001442",
        help="Chain run directory with originals/ + manifest.json",
    )
    parser.add_argument(
        "--update-samples",
        action="store_true",
        help="Also copy rebuilt cleaned files into samples/",
    )
    args = parser.parse_args()
    rebuild(args.run_dir.resolve(), update_samples=args.update_samples)


if __name__ == "__main__":
    main()
