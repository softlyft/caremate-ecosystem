from __future__ import annotations

import logging
from typing import Any
from uuid import uuid4

from app.excel_json import reference_id
from app.jobs import JobStatus, job_store
from app.keys import (
    location_temp_keys,
    organization_temp_keys,
    resolve_mapped_id,
    slugify,
)
from app.mappers.resource_rows import (
    map_healthcare_service_row,
    map_location_row,
    map_organization_row,
)
from app.parsers.resource_xlsx import iter_resource_xlsx_rows
from app.projection import rebuild_projections_bulk
from app.run_storage import IngestEnv, create_run_dir, save_bytes, write_manifest
from app.samples_sync import copy_cleaned_to_samples, publish_local_samples_to_storage
from app.settings import Settings, bind_env, get_settings
from app.workbook_writeback import (
    apply_cell_updates,
    location_reference,
    organization_reference,
)
from app.writers.supabase import SupabaseWriter

logger = logging.getLogger(__name__)

ORG_COLUMNS = [
    "id",
    "name",
    "type",
    "active",
    "resource",
    "source",
    "last_ingested_at",
    "deleted_at",
    "updated_at",
]
LOC_COLUMNS = [
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
]
HS_COLUMNS = [
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
]


def _row_label(row: dict[str, Any]) -> str:
    return f"Sheet {row.get('_sheet')} row {row.get('_row')}"


def _assign_id(mapped: dict[str, Any]) -> tuple[dict[str, Any], str]:
    """Ensure mapped row has a UUID id + resource.id. Returns (mapped, action)."""
    if mapped.get("id"):
        resource = mapped.get("resource") or {}
        if isinstance(resource, dict) and resource.get("id") != mapped["id"]:
            mapped = {**mapped, "resource": {**resource, "id": mapped["id"]}}
        return mapped, "updated"
    new_id = str(uuid4())
    resource = mapped.get("resource") or {}
    if not isinstance(resource, dict):
        resource = {}
    mapped = {
        **mapped,
        "id": new_id,
        "resource": {**resource, "id": new_id},
    }
    return mapped, "inserted"


def _payload(mapped: dict[str, Any], columns: list[str]) -> dict[str, Any]:
    return {key: mapped.get(key) for key in columns}


def run_chain_ingest_job(
    *,
    job_id: str,
    organization_content: bytes,
    organization_filename: str,
    location_content: bytes | None = None,
    location_filename: str | None = None,
    healthcareservice_content: bytes | None = None,
    healthcareservice_filename: str | None = None,
    source: str = "csv_ingest",
    env: IngestEnv = "dev",
    settings: Settings | None = None,
    publish_samples: bool | None = None,
) -> None:
    """
    Org → Location → HealthcareService with spreadsheet write-back.
    Uses batched upserts (client-side UUIDs) for catalog-scale workbooks.

    Empty target catalog → catalog_mode=bootstrap (seed). Otherwise update.
    """
    settings = settings or get_settings()
    env_settings = bind_env(settings, env)
    job_store.update(job_id, status=JobStatus.running)

    if not env_settings.enabled():
        job_store.update(
            job_id,
            status=JobStatus.failed,
            error=f"Supabase credentials not configured for env={env}",
        )
        return

    writer_settings = Settings(
        ingest_api_key=env_settings.ingest_api_key,
        supabase_url=env_settings.supabase_url,
        supabase_service_role_key=env_settings.supabase_service_role_key,
        runs_dir=env_settings.runs_dir,
        host=env_settings.host,
        port=env_settings.port,
    )
    writer = SupabaseWriter(writer_settings)
    run = create_run_dir(env_settings.runs_dir, env)

    try:
        catalog_empty = writer.catalog_is_empty()
        catalog_mode = "bootstrap" if catalog_empty else "update"
        logger.info(
            "Chain ingest job %s env=%s catalog_mode=%s (orgs empty=%s)",
            job_id,
            env,
            catalog_mode,
            catalog_empty,
        )

        save_bytes(run.originals / organization_filename, organization_content)
        if location_content and location_filename:
            save_bytes(run.originals / location_filename, location_content)
        if healthcareservice_content and healthcareservice_filename:
            save_bytes(run.originals / healthcareservice_filename, healthcareservice_content)

        org_rows = iter_resource_xlsx_rows(organization_content)
        if not org_rows:
            raise ValueError("Organization workbook has no data rows")

        org_key_to_uuid: dict[str, str] = {}
        org_updates: list[dict[str, Any]] = []
        org_payloads: list[dict[str, Any]] = []
        organizations_by_id: dict[str, dict[str, Any]] = {}
        org_inserted = 0
        org_updated = 0
        org_ids: list[str] = []
        seen_org_names: dict[str, str] = {}

        existing_by_name = writer.list_organization_name_ids()
        logger.info("Loaded %s existing organization names", len(existing_by_name))

        for row in org_rows:
            try:
                mapped = map_organization_row(row, source=source)
            except ValueError as exc:
                raise ValueError(f"{_row_label(row)}: {exc}") from exc

            name_key = str(mapped.get("name") or "").strip().casefold()
            if name_key and name_key in seen_org_names:
                # Workbook duplicate name → reuse first UUID (unique name constraint)
                org_uuid = seen_org_names[name_key]
                action = "updated"
                mapped = {
                    **mapped,
                    "id": org_uuid,
                    "resource": {
                        **(mapped.get("resource") or {}),
                        "id": org_uuid,
                    },
                }
            else:
                if not mapped.get("id") and name_key and name_key in existing_by_name:
                    existing_id = existing_by_name[name_key]
                    mapped = {
                        **mapped,
                        "id": existing_id,
                        "resource": {
                            **(mapped.get("resource") or {}),
                            "id": existing_id,
                        },
                    }
                mapped, action = _assign_id(mapped)
                org_uuid = str(mapped["id"])
                if name_key:
                    seen_org_names[name_key] = org_uuid
                payload = _payload(mapped, ORG_COLUMNS)
                org_payloads.append(payload)
                organizations_by_id[org_uuid] = payload
                org_ids.append(org_uuid)
                if action == "inserted":
                    org_inserted += 1
                else:
                    org_updated += 1

            for key in organization_temp_keys(row):
                org_key_to_uuid[key] = org_uuid
            org_key_to_uuid[org_uuid] = org_uuid

            org_updates.append(
                {
                    "sheet": row["_sheet"],
                    "row": row["_row"],
                    "values": {"id": org_uuid},
                }
            )

        logger.info(
            "Chain org upsert: %s unique rows (%s workbook rows)",
            len(org_payloads),
            len(org_rows),
        )
        writer.upsert("provider_organizations", org_payloads)

        cleaned_org = apply_cell_updates(organization_content, org_updates)
        save_bytes(run.cleaned / f"organization-{run.run_id}.xlsx", cleaned_org)

        loc_key_to_uuid: dict[str, str] = {}
        loc_details: dict[str, Any] = {
            "parsed": 0,
            "inserted": 0,
            "updated": 0,
            "skipped": 0,
            "skip_reasons": [],
            "ids": [],
        }
        loc_payloads: list[dict[str, Any]] = []
        locations_by_id: dict[str, dict[str, Any]] = {}

        if location_content:
            loc_rows = iter_resource_xlsx_rows(location_content)
            loc_details["parsed"] = len(loc_rows)
            loc_updates: list[dict[str, Any]] = []
            for row in loc_rows:
                raw_org = reference_id(row.get("managingOrganization"), "Organization")
                resolved_org = resolve_mapped_id(raw_org, org_key_to_uuid)
                if not resolved_org and raw_org:
                    resolved_org = resolve_mapped_id(slugify(raw_org), org_key_to_uuid)
                if not resolved_org:
                    loc_details["skipped"] += 1
                    loc_details["skip_reasons"].append(
                        f"{_row_label(row)}: cannot resolve managingOrganization "
                        f"{raw_org!r} to an organization UUID"
                    )
                    continue

                patched = {
                    **row,
                    "managingOrganization": organization_reference(resolved_org),
                }
                try:
                    mapped_loc = map_location_row(patched, source=source)
                except ValueError as exc:
                    raise ValueError(f"{_row_label(row)}: {exc}") from exc
                if mapped_loc is None:
                    loc_details["skipped"] += 1
                    loc_details["skip_reasons"].append(
                        f"{_row_label(row)}: orphan after resolve (unexpected)"
                    )
                    continue

                mapped_loc, action = _assign_id(mapped_loc)
                # Ensure managingOrganization in resource points at resolved UUID
                resource = mapped_loc.get("resource") or {}
                if isinstance(resource, dict):
                    mapped_loc["resource"] = {
                        **resource,
                        "managingOrganization": organization_reference(resolved_org),
                    }

                loc_uuid = str(mapped_loc["id"])
                loc_details["ids"].append(loc_uuid)
                if action == "inserted":
                    loc_details["inserted"] += 1
                else:
                    loc_details["updated"] += 1

                payload = _payload(mapped_loc, LOC_COLUMNS)
                loc_payloads.append(payload)
                locations_by_id[loc_uuid] = payload

                for key in location_temp_keys(row):
                    loc_key_to_uuid[key] = loc_uuid
                loc_key_to_uuid[loc_uuid] = loc_uuid

                loc_updates.append(
                    {
                        "sheet": row["_sheet"],
                        "row": row["_row"],
                        "values": {
                            "id": loc_uuid,
                            "managingOrganization": organization_reference(resolved_org),
                        },
                    }
                )

            logger.info("Chain location upsert: %s rows", len(loc_payloads))
            writer.upsert("provider_locations", loc_payloads)
            cleaned_loc = apply_cell_updates(location_content, loc_updates)
            save_bytes(run.cleaned / f"location-{run.run_id}.xlsx", cleaned_loc)
            loc_details["skip_reasons"] = loc_details["skip_reasons"][:50]

        hs_details: dict[str, Any] = {
            "parsed": 0,
            "inserted": 0,
            "updated": 0,
            "skipped": 0,
            "skip_reasons": [],
            "ids": [],
        }
        hs_payloads: list[dict[str, Any]] = []
        services_by_location: dict[str, list[dict[str, Any]]] = {}

        if healthcareservice_content:
            hs_rows = iter_resource_xlsx_rows(healthcareservice_content)
            hs_details["parsed"] = len(hs_rows)
            hs_updates: list[dict[str, Any]] = []
            for row in hs_rows:
                raw_loc = reference_id(row.get("location"), "Location")
                resolved_loc = resolve_mapped_id(raw_loc, loc_key_to_uuid)
                if not resolved_loc and raw_loc:
                    resolved_loc = resolve_mapped_id(slugify(raw_loc), loc_key_to_uuid)
                if not resolved_loc:
                    hs_details["skipped"] += 1
                    hs_details["skip_reasons"].append(
                        f"{_row_label(row)}: cannot resolve location {raw_loc!r} to a location UUID"
                    )
                    continue

                patched = {**row, "location": location_reference(resolved_loc)}
                try:
                    mapped_hs = map_healthcare_service_row(patched, source=source)
                except ValueError as exc:
                    raise ValueError(f"{_row_label(row)}: {exc}") from exc
                if mapped_hs is None:
                    hs_details["skipped"] += 1
                    hs_details["skip_reasons"].append(
                        f"{_row_label(row)}: orphan after resolve (unexpected)"
                    )
                    continue

                loc = locations_by_id.get(resolved_loc)
                if not loc:
                    hs_details["skipped"] += 1
                    hs_details["skip_reasons"].append(
                        f"{_row_label(row)}: location {resolved_loc} not found in this chain run"
                    )
                    continue

                mapped_hs["organization_id"] = loc["organization_id"]
                resource = mapped_hs.get("resource") or {}
                if isinstance(resource, dict):
                    mapped_hs["resource"] = {
                        **resource,
                        "location": location_reference(resolved_loc),
                        "providedBy": resource.get("providedBy")
                        or organization_reference(str(loc["organization_id"])),
                    }

                mapped_hs, action = _assign_id(mapped_hs)
                hs_uuid = str(mapped_hs["id"])
                hs_details["ids"].append(hs_uuid)
                if action == "inserted":
                    hs_details["inserted"] += 1
                else:
                    hs_details["updated"] += 1

                payload = _payload(mapped_hs, HS_COLUMNS)
                hs_payloads.append(payload)
                services_by_location.setdefault(resolved_loc, []).append(payload)

                hs_updates.append(
                    {
                        "sheet": row["_sheet"],
                        "row": row["_row"],
                        "values": {
                            "id": hs_uuid,
                            "location": location_reference(resolved_loc),
                        },
                    }
                )

            logger.info("Chain healthcare service upsert: %s rows", len(hs_payloads))
            writer.upsert("provider_healthcare_services", hs_payloads)
            cleaned_hs = apply_cell_updates(healthcareservice_content, hs_updates)
            save_bytes(
                run.cleaned / f"healthcareservice-{run.run_id}.xlsx",
                cleaned_hs,
            )
            hs_details["skip_reasons"] = hs_details["skip_reasons"][:50]

        projected = 0
        if loc_payloads:
            logger.info("Chain projection rebuild: %s locations", len(loc_payloads))
            projected = rebuild_projections_bulk(
                writer,
                locations=loc_payloads,
                organizations_by_id=organizations_by_id,
                services_by_location=services_by_location,
            )

        details = {
            "env": env,
            "catalog_mode": catalog_mode,
            "catalog_was_empty": catalog_empty,
            "run_id": run.run_id,
            "run_dir": str(run.root),
            "organization": {
                "parsed": len(org_rows),
                "inserted": org_inserted,
                "updated": org_updated,
                "ids": org_ids[:100],
                "id_count": len(org_ids),
                "key_map_size": len(org_key_to_uuid),
                "cleaned_file": str(run.cleaned / f"organization-{run.run_id}.xlsx"),
            },
            "location": {
                **{k: v for k, v in loc_details.items() if k != "ids"},
                "ids": (loc_details.get("ids") or [])[:100],
                "id_count": len(loc_details.get("ids") or []),
                "key_map_size": len(loc_key_to_uuid),
                "cleaned_file": str(run.cleaned / f"location-{run.run_id}.xlsx")
                if location_content
                else None,
            },
            "healthcareservice": {
                **{k: v for k, v in hs_details.items() if k != "ids"},
                "ids": (hs_details.get("ids") or [])[:100],
                "id_count": len(hs_details.get("ids") or []),
                "cleaned_file": str(run.cleaned / f"healthcareservice-{run.run_id}.xlsx")
                if healthcareservice_content
                else None,
            },
            "projections_updated": projected,
            "files": {
                "originals": str(run.originals),
                "cleaned": str(run.cleaned),
                "manifest": str(run.manifest_path),
            },
        }

        should_publish = (
            settings.samples_publish_after_chain if publish_samples is None else publish_samples
        )
        if should_publish:
            org_cleaned = run.cleaned / f"organization-{run.run_id}.xlsx"
            loc_cleaned = run.cleaned / f"location-{run.run_id}.xlsx"
            hs_cleaned = run.cleaned / f"healthcareservice-{run.run_id}.xlsx"
            copy_cleaned_to_samples(
                settings,
                organization=org_cleaned,
                location=loc_cleaned if loc_cleaned.is_file() else None,
                healthcareservice=hs_cleaned if hs_cleaned.is_file() else None,
            )
            published = publish_local_samples_to_storage(settings)
            details["samples_published"] = published
            logger.info("Published cleaned samples to Storage: %s", published)

        # Full key maps live in manifest only (too large for job store)
        write_manifest(
            run,
            {
                "job_id": job_id,
                "source": source,
                "details": details,
                "organization_key_map": org_key_to_uuid,
                "location_key_map": loc_key_to_uuid,
            },
        )

        job_store.update(
            job_id,
            status=JobStatus.completed,
            providers_upserted=projected,
            details=details,
        )
        logger.info(
            "Chain ingest job %s completed env=%s run=%s mode=%s",
            job_id,
            env,
            run.run_id,
            catalog_mode,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Chain ingest job %s failed", job_id)
        try:
            write_manifest(
                run,
                {"job_id": job_id, "source": source, "error": str(exc), "status": "failed"},
            )
        except Exception:  # noqa: BLE001
            pass
        job_store.update(job_id, status=JobStatus.failed, error=str(exc))
