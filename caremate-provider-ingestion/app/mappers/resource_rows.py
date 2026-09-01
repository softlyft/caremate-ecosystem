from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.excel_json import (
    distance_km_from_characteristics,
    format_address,
    is_uuid,
    parse_json_cell,
    position_coords,
    provider_type_from_CodeableConcept,
    reference_id,
    resource_id_hint,
    telecom_value,
)

ORG_CATALOG_TYPES = frozenset(
    {
        "hospital",
        "clinic",
        "pharmacy",
        "laboratory",
        "imaging_centre",
        "dentist",
        "eye_care",
    }
)


def _organization_catalog_type(resource: dict[str, Any]) -> str | None:
    explicit = resource.get("type")
    if isinstance(explicit, str) and explicit.strip() in ORG_CATALOG_TYPES:
        return explicit.strip()
    parsed = provider_type_from_CodeableConcept(explicit)
    if parsed in ORG_CATALOG_TYPES:
        return parsed
    return None


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def map_organization_row(row: dict[str, Any], *, source: str) -> dict[str, Any]:
    hint = resource_id_hint(row)
    name = str(row.get("name") or "").strip()
    if not name:
        raise ValueError("organization name is required")

    update_id = hint if hint and is_uuid(hint) else None
    resource = {
        "resourceType": "Organization",
        "id": update_id,
        "identifier": parse_json_cell(row.get("identifier")),
        "active": bool(row.get("active") if row.get("active") is not None else True),
        "type": parse_json_cell(row.get("type")),
        "name": name,
        "alias": parse_json_cell(row.get("alias")),
        "description": row.get("description"),
        "contact": parse_json_cell(row.get("contact")),
        "partOf": parse_json_cell(row.get("partOf")),
        "endpoint": parse_json_cell(row.get("endpoint")),
        "qualification": parse_json_cell(row.get("qualification")),
    }
    return {
        "id": update_id,
        "name": name,
        "type": _organization_catalog_type(resource),
        "active": resource["active"],
        "resource": resource,
        "source": source,
        "last_ingested_at": _now(),
        "deleted_at": None,
        "updated_at": _now(),
        "provider_type": provider_type_from_CodeableConcept(row.get("type")) or "clinic",
        "phone": telecom_value(row.get("contact"), "phone"),
        "email": telecom_value(row.get("contact"), "email"),
    }


def map_location_row(row: dict[str, Any], *, source: str) -> dict[str, Any] | None:
    """
    Orphan rule: no managingOrganization (or not a UUID) → skip (return None).
    Parent UUID present → caller validates org exists; location id non-UUID → insert, UUID → update.
    """
    org_ref = reference_id(row.get("managingOrganization"), "Organization")
    if not org_ref or not is_uuid(org_ref):
        return None

    name = str(row.get("name") or "").strip()
    if not name:
        raise ValueError("location name is required")

    hint = resource_id_hint(row)
    update_id = hint if hint and is_uuid(hint) else None
    latitude, longitude = position_coords(row.get("position"))
    resource = {
        "resourceType": "Location",
        "id": update_id,
        "identifier": parse_json_cell(row.get("identifier")),
        "status": row.get("status") or "active",
        "operationalStatus": parse_json_cell(row.get("operationalStatus")),
        "code": parse_json_cell(row.get("code")),
        "name": name,
        "alias": parse_json_cell(row.get("alias")),
        "description": row.get("description"),
        "mode": row.get("mode") or "instance",
        "type": parse_json_cell(row.get("type")),
        "contact": parse_json_cell(row.get("contact")),
        "address": parse_json_cell(row.get("address")),
        "form": parse_json_cell(row.get("form")),
        "position": parse_json_cell(row.get("position")),
        "managingOrganization": parse_json_cell(row.get("managingOrganization")),
        "partOf": parse_json_cell(row.get("partOf")),
        "characteristics": parse_json_cell(row.get("characteristics")),
        "hoursOfOperation": parse_json_cell(row.get("hoursOfOperation")),
        "virtualService": parse_json_cell(row.get("virtualService")),
        "endpoint": parse_json_cell(row.get("endpoint")),
    }
    return {
        "id": update_id,
        "organization_id": org_ref,
        "name": name,
        "status": str(resource["status"]),
        "latitude": latitude,
        "longitude": longitude,
        "address": format_address(row.get("address")),
        "phone": telecom_value(row.get("contact"), "phone"),
        "email": telecom_value(row.get("contact"), "email"),
        "distance_km": distance_km_from_characteristics(row.get("characteristics")),
        "resource": resource,
        "source": source,
        "last_ingested_at": _now(),
        "deleted_at": None,
        "updated_at": _now(),
        "provider_type": provider_type_from_CodeableConcept(row.get("type")),
    }


def map_healthcare_service_row(row: dict[str, Any], *, source: str) -> dict[str, Any] | None:
    """
    Orphan rule: no location (or not a UUID) → skip (return None).
    Location UUID present → caller validates location; HS id non-UUID → insert, UUID → update.
    organization_id is filled from the location row after validation.
    """
    loc_ref = reference_id(row.get("location"), "Location")
    if not loc_ref or not is_uuid(loc_ref):
        return None

    name = str(row.get("name") or "").strip()
    if not name:
        raise ValueError("healthcare service name is required")

    hint = resource_id_hint(row)
    update_id = hint if hint and is_uuid(hint) else None
    service_type = (
        provider_type_from_CodeableConcept(row.get("type"))
        or provider_type_from_CodeableConcept(row.get("category"))
    )
    # organization_id filled by pipeline after location lookup
    provided_by = parse_json_cell(row.get("providedBy"))
    resource = {
        "resourceType": "HealthcareService",
        "id": update_id,
        "identifier": parse_json_cell(row.get("identifier")),
        "active": bool(row.get("active") if row.get("active") is not None else True),
        "providedBy": provided_by,
        "offeredIn": parse_json_cell(row.get("offeredIn")),
        "category": parse_json_cell(row.get("category")),
        "type": parse_json_cell(row.get("type")),
        "specialty": parse_json_cell(row.get("specialty")),
        "location": parse_json_cell(row.get("location")),
        "name": name,
        "comment": row.get("comment"),
        "extraDetails": row.get("extraDetails"),
        "photo": parse_json_cell(row.get("photo")),
        "contact": parse_json_cell(row.get("contact")),
        "coverageArea": parse_json_cell(row.get("coverageArea")),
        "serviceProvisionCode": parse_json_cell(row.get("serviceProvisionCode")),
        "eligibility": parse_json_cell(row.get("eligibility")),
        "program": parse_json_cell(row.get("program")),
        "characteristics": parse_json_cell(row.get("characteristics")),
        "communication": parse_json_cell(row.get("commnication") or row.get("communication")),
        "referralMethod": parse_json_cell(row.get("referralMethod")),
        "referralRequired": row.get("referralRequired"),
        "appointmentRequired": row.get("appointmentRequired"),
        "availability": parse_json_cell(row.get("availability")),
        "endpoint": parse_json_cell(row.get("endpoint")),
    }
    return {
        "id": update_id,
        "organization_id": None,
        "location_id": loc_ref,
        "name": name,
        "active": resource["active"],
        "service_type": service_type,
        "resource": resource,
        "source": source,
        "last_ingested_at": _now(),
        "deleted_at": None,
        "updated_at": _now(),
    }
