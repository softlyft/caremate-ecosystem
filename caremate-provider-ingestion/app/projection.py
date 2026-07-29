from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.excel_json import provider_type_from_CodeableConcept, telecom_value
from app.writers.supabase import SupabaseWriter


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _org_phone(org: dict[str, Any]) -> str | None:
    return telecom_value((org.get("resource") or {}).get("contact"), "phone")


def _org_email(org: dict[str, Any]) -> str | None:
    return telecom_value((org.get("resource") or {}).get("contact"), "email")


def provider_row_for_location(
    loc: dict[str, Any],
    org: dict[str, Any] | None,
    services: list[dict[str, Any]],
) -> dict[str, Any]:
    """Build one Nearby `providers` projection row from in-memory org/loc/services."""
    org_id = loc["organization_id"]
    location_id = str(loc["id"])
    org_resource = (org or {}).get("resource") or {}
    provider_type = "clinic"
    if services and services[0].get("service_type"):
        provider_type = services[0]["service_type"]
    elif org_resource:
        provider_type = provider_type_from_CodeableConcept(org_resource.get("type")) or "clinic"

    phone = loc.get("phone") or (org and _org_phone(org))
    email = loc.get("email") or (org and _org_email(org))
    name = loc.get("name") or (org or {}).get("name") or "Unknown provider"
    now = _now()
    hs_ids = [s["id"] for s in services]
    return {
        "id": location_id,
        "name": name,
        "type": provider_type,
        "address": loc.get("address"),
        "phone": phone,
        "email": email,
        "latitude": loc.get("latitude"),
        "longitude": loc.get("longitude"),
        "distance_km": loc.get("distance_km"),
        "attributes": {
            "organization_id": org_id,
            "location_id": location_id,
            "services": [
                {
                    "id": s["id"],
                    "name": s["name"],
                    "type": s.get("service_type"),
                    "active": s.get("active", True),
                }
                for s in services
            ],
        },
        "external_id": location_id,
        "source": loc.get("source") or "csv_ingest",
        "active": (org or {}).get("active", True) and str(loc.get("status") or "active") == "active",
        "last_ingested_at": now,
        "deleted_at": None,
        "organization_id": org_id,
        "location_id": location_id,
        "healthcare_service_ids": hs_ids,
        "updated_at": now,
    }


def rebuild_projection_for_location(writer: SupabaseWriter, location_id: str) -> dict[str, Any] | None:
    """One Nearby pin per Location, enriched with Org + HealthcareServices at that site."""
    locations = writer.select(
        "provider_locations",
        params={"id": f"eq.{location_id}", "deleted_at": "is.null", "select": "*"},
    )
    if not locations:
        return None
    loc = locations[0]
    org_id = loc["organization_id"]

    orgs = writer.select(
        "provider_organizations",
        params={"id": f"eq.{org_id}", "deleted_at": "is.null", "select": "*"},
    )
    org = orgs[0] if orgs else None

    services = writer.select(
        "provider_healthcare_services",
        params={
            "location_id": f"eq.{location_id}",
            "deleted_at": "is.null",
            "select": "*",
            "order": "name.asc",
        },
    )

    row = provider_row_for_location(loc, org, services)
    writer.upsert("providers", [row])
    if org_id and org_id != location_id:
        writer.soft_delete_providers_by_ids([org_id])
    return row


def rebuild_projections_for_organization(writer: SupabaseWriter, organization_id: str) -> int:
    locations = writer.select(
        "provider_locations",
        params={
            "organization_id": f"eq.{organization_id}",
            "deleted_at": "is.null",
            "select": "id",
        },
    )
    count = 0
    for loc in locations:
        if rebuild_projection_for_location(writer, loc["id"]):
            count += 1
    return count


def rebuild_projections_bulk(
    writer: SupabaseWriter,
    *,
    locations: list[dict[str, Any]],
    organizations_by_id: dict[str, dict[str, Any]],
    services_by_location: dict[str, list[dict[str, Any]]],
) -> int:
    """Upsert Nearby pins for many locations without per-row round-trips."""
    provider_rows: list[dict[str, Any]] = []
    legacy_org_ids: list[str] = []
    for loc in locations:
        loc_id = str(loc["id"])
        org_id = str(loc["organization_id"])
        org = organizations_by_id.get(org_id)
        services = services_by_location.get(loc_id, [])
        provider_rows.append(provider_row_for_location(loc, org, services))
        if org_id and org_id != loc_id:
            legacy_org_ids.append(org_id)

    written = writer.upsert("providers", provider_rows)
    # Soft-delete legacy org-id pins only for small runs (catalog-scale skips this).
    if len(locations) <= 1000:
        unique_legacy = list(dict.fromkeys(legacy_org_ids))
        writer.soft_delete_providers_by_ids(unique_legacy)
    return written
