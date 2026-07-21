from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.excel_json import provider_type_from_CodeableConcept
from app.writers.supabase import SupabaseWriter


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


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

    org_resource = (org or {}).get("resource") or {}
    provider_type = "clinic"
    if services and services[0].get("service_type"):
        provider_type = services[0]["service_type"]
    elif org_resource:
        provider_type = provider_type_from_CodeableConcept(org_resource.get("type")) or "clinic"

    phone = loc.get("phone") or (org and _org_phone(org))
    email = loc.get("email") or (org and _org_email(org))
    name = loc.get("name") or (org or {}).get("name") or "Unknown provider"

    hs_ids = [s["id"] for s in services]
    attributes: dict[str, Any] = {
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
    }

    now = _now()
    row = {
        "id": location_id,
        "name": name,
        "type": provider_type,
        "address": loc.get("address"),
        "phone": phone,
        "email": email,
        "latitude": loc.get("latitude"),
        "longitude": loc.get("longitude"),
        "distance_km": loc.get("distance_km"),
        "attributes": attributes,
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
    writer.upsert("providers", [row])
    # Soft-delete legacy org-id pins so Nearby doesn't duplicate
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


def _org_phone(org: dict[str, Any]) -> str | None:
    from app.excel_json import telecom_value

    return telecom_value((org.get("resource") or {}).get("contact"), "phone")


def _org_email(org: dict[str, Any]) -> str | None:
    from app.excel_json import telecom_value

    return telecom_value((org.get("resource") or {}).get("contact"), "email")
