from __future__ import annotations

import logging
from typing import Any, Literal

from app.jobs import JobStatus, job_store
from app.mappers.resource_rows import (
    map_healthcare_service_row,
    map_location_row,
    map_organization_row,
)
from app.parsers.resource_xlsx import iter_resource_xlsx_rows
from app.projection import rebuild_projection_for_location, rebuild_projections_for_organization
from app.settings import Settings, get_settings
from app.writers.supabase import SupabaseWriter

logger = logging.getLogger(__name__)

ResourceKind = Literal["organization", "location", "healthcareservice"]


def _persist_mapped(
    writer: SupabaseWriter,
    *,
    table: str,
    mapped: list[dict[str, Any]],
    columns: list[str],
    label: str,
    unique_name: bool = False,
) -> tuple[list[dict[str, Any]], int, int]:
    saved_rows: list[dict[str, Any]] = []
    inserted = 0
    updated = 0
    for m in mapped:
        payload = {key: m.get(key) for key in columns}
        saved, action = writer.insert_or_update(
            table, payload, label=label, unique_name=unique_name
        )
        saved_rows.append(saved)
        if action == "inserted":
            inserted += 1
        else:
            updated += 1
    return saved_rows, inserted, updated


def _row_label(row: dict[str, Any]) -> str:
    return f"Sheet {row.get('_sheet')} row {row.get('_row')}"


def run_resource_ingest_job(
    *,
    job_id: str,
    content: bytes,
    filename: str,
    resource: ResourceKind,
    source: str,
    settings: Settings | None = None,
) -> None:
    settings = settings or get_settings()
    job_store.update(job_id, status=JobStatus.running)
    writer = SupabaseWriter(settings)

    try:
        rows = iter_resource_xlsx_rows(content)
        if not rows:
            raise ValueError("No data rows found in workbook")

        if resource == "organization":
            mapped: list[dict[str, Any]] = []
            for row in rows:
                try:
                    mapped.append(map_organization_row(row, source=source))
                except ValueError as exc:
                    raise ValueError(f"{_row_label(row)}: {exc}") from exc
            saved, inserted, updated = _persist_mapped(
                writer,
                table="provider_organizations",
                mapped=mapped,
                columns=[
                    "id",
                    "name",
                    "active",
                    "resource",
                    "source",
                    "last_ingested_at",
                    "deleted_at",
                    "updated_at",
                ],
                label="organization",
                unique_name=True,
            )
            projected = 0
            for row in saved:
                projected += rebuild_projections_for_organization(writer, str(row["id"]))
            details = {
                "parsed": len(rows),
                "skipped": 0,
                "inserted": inserted,
                "updated": updated,
                "projections_updated": projected,
                "ids": [str(r["id"]) for r in saved],
            }

        elif resource == "location":
            mapped = []
            skipped = 0
            skip_reasons: list[str] = []
            for row in rows:
                try:
                    mapped_row = map_location_row(row, source=source)
                except ValueError as exc:
                    raise ValueError(f"{_row_label(row)}: {exc}") from exc
                if mapped_row is None:
                    skipped += 1
                    skip_reasons.append(
                        f"{_row_label(row)}: orphan — missing/non-UUID managingOrganization"
                    )
                    continue
                org = writer.get_by_id("provider_organizations", mapped_row["organization_id"])
                if not org:
                    skipped += 1
                    skip_reasons.append(
                        f"{_row_label(row)}: managingOrganization UUID "
                        f"{mapped_row['organization_id']} not found"
                    )
                    continue
                mapped.append(mapped_row)

            saved, inserted, updated = _persist_mapped(
                writer,
                table="provider_locations",
                mapped=mapped,
                columns=[
                    "id",
                    "organization_id",
                    "name",
                    "status",
                    "latitude",
                    "longitude",
                    "address",
                    "phone",
                    "email",
                    "distance_km",
                    "resource",
                    "source",
                    "last_ingested_at",
                    "deleted_at",
                    "updated_at",
                ],
                label="location",
            )
            projected = 0
            for row in saved:
                if rebuild_projection_for_location(writer, str(row["id"])):
                    projected += 1
            details = {
                "parsed": len(rows),
                "skipped": skipped,
                "skip_reasons": skip_reasons[:50],
                "inserted": inserted,
                "updated": updated,
                "projections_updated": projected,
                "ids": [str(r["id"]) for r in saved],
            }

        else:  # healthcareservice
            mapped = []
            skipped = 0
            skip_reasons = []
            for row in rows:
                try:
                    mapped_row = map_healthcare_service_row(row, source=source)
                except ValueError as exc:
                    raise ValueError(f"{_row_label(row)}: {exc}") from exc
                if mapped_row is None:
                    skipped += 1
                    skip_reasons.append(f"{_row_label(row)}: orphan — missing/non-UUID location")
                    continue
                loc = writer.get_by_id("provider_locations", mapped_row["location_id"])
                if not loc:
                    skipped += 1
                    skip_reasons.append(
                        f"{_row_label(row)}: location UUID {mapped_row['location_id']} not found"
                    )
                    continue
                mapped_row["organization_id"] = loc["organization_id"]
                # Keep FHIR providedBy aligned with org from location when blank
                resource = mapped_row.get("resource") or {}
                if isinstance(resource, dict) and not resource.get("providedBy"):
                    resource = {
                        **resource,
                        "providedBy": {"reference": f"Organization/{loc['organization_id']}"},
                    }
                    mapped_row["resource"] = resource
                mapped.append(mapped_row)

            saved, inserted, updated = _persist_mapped(
                writer,
                table="provider_healthcare_services",
                mapped=mapped,
                columns=[
                    "id",
                    "organization_id",
                    "location_id",
                    "name",
                    "active",
                    "service_type",
                    "resource",
                    "source",
                    "last_ingested_at",
                    "deleted_at",
                    "updated_at",
                ],
                label="healthcare service",
            )
            loc_ids = {str(m["location_id"]) for m in saved if m.get("location_id")}
            projected = 0
            for loc_id in loc_ids:
                if rebuild_projection_for_location(writer, loc_id):
                    projected += 1
            details = {
                "parsed": len(rows),
                "skipped": skipped,
                "skip_reasons": skip_reasons[:50],
                "inserted": inserted,
                "updated": updated,
                "projections_updated": projected,
                "ids": [str(r["id"]) for r in saved],
            }

        job_store.update(
            job_id,
            status=JobStatus.completed,
            providers_upserted=details.get("projections_updated", 0),
            details=details,
        )
        logger.info("Ingest %s job %s completed: %s", resource, job_id, details)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Ingest %s job %s failed", resource, job_id)
        job_store.update(job_id, status=JobStatus.failed, error=str(exc))


def run_ingest_job(**kwargs):  # type: ignore[no-untyped-def]
    raise RuntimeError(
        "Deprecated. Use /v1/ingest/organization|location|healthcareservice instead."
    )
