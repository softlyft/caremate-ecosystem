from __future__ import annotations

import json
import re
from typing import Any

from app.canonical import PROVIDER_TYPES, ProviderCanonical

# Accept common aliases → canonical column
COLUMN_ALIASES: dict[str, str] = {
    "organization_id": "organization_id",
    "org_id": "organization_id",
    "id": "organization_id",
    "organization_name": "organization_name",
    "org_name": "organization_name",
    "name": "organization_name",
    "active": "active",
    "phone": "phone",
    "telephone": "phone",
    "email": "email",
    "address_line": "address_line",
    "address": "address_line",
    "line": "address_line",
    "city": "city",
    "state": "state",
    "postal_code": "postal_code",
    "postalcode": "postal_code",
    "zip": "postal_code",
    "country": "country",
    "latitude": "latitude",
    "lat": "latitude",
    "longitude": "longitude",
    "lng": "longitude",
    "lon": "longitude",
    "location_id": "location_id",
    "location_name": "location_name",
    "healthcare_service_id": "healthcare_service_id",
    "service_id": "healthcare_service_id",
    "healthcare_service_name": "healthcare_service_name",
    "service_name": "healthcare_service_name",
    "service_category": "service_category",
    "specialty": "specialty",
    "appointment_required": "appointment_required",
    "attributes_json": "attributes_json",
    "attributes": "attributes_json",
}


def _norm_header(value: Any) -> str:
    text = str(value or "").strip().lower()
    text = re.sub(r"[\s\-]+", "_", text)
    return COLUMN_ALIASES.get(text, text)


def normalize_row_keys(row: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key, value in row.items():
        canon = _norm_header(key)
        if canon in out and (value is None or (isinstance(value, float) and str(value) == "nan")):
            continue
        out[canon] = value
    return out


def _clean_str(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, float) and str(value) == "nan":
        return None
    text = str(value).strip()
    if not text or text.lower() == "nan":
        return None
    return text


def _parse_bool(value: Any, default: bool = True) -> bool:
    if value is None or (isinstance(value, float) and str(value) == "nan"):
        return default
    if isinstance(value, bool):
        return value
    text = str(value).strip().lower()
    if text in {"", "nan"}:
        return default
    if text in {"1", "true", "yes", "y", "active"}:
        return True
    if text in {"0", "false", "no", "n", "inactive"}:
        return False
    return default


def _parse_float(value: Any) -> float | None:
    text = _clean_str(value)
    if text is None:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _parse_attributes(value: Any) -> dict[str, Any]:
    text = _clean_str(value)
    if not text:
        return {}
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return {}
    if isinstance(parsed, dict):
        return parsed
    return {}


def format_address(
    *,
    address_line: str | None,
    city: str | None,
    state: str | None,
    postal_code: str | None,
    country: str | None,
) -> str | None:
    parts = [p for p in [address_line, city, state, postal_code, country] if p]
    return ", ".join(parts) if parts else None


def row_to_canonical(
    row: dict[str, Any],
    *,
    provider_type: str,
    extra_attributes: dict[str, Any] | None = None,
    source: str = "csv_ingest",
) -> ProviderCanonical:
    data = normalize_row_keys(row)
    org_id = _clean_str(data.get("organization_id"))
    name = _clean_str(data.get("organization_name"))
    if not org_id:
        raise ValueError("organization_id is required")
    if not name:
        raise ValueError("organization_name is required")

    if provider_type not in PROVIDER_TYPES:
        provider_type = "clinic"

    attributes = _parse_attributes(data.get("attributes_json"))
    if extra_attributes:
        attributes = {**extra_attributes, **attributes}

    location_id = _clean_str(data.get("location_id"))
    location_name = _clean_str(data.get("location_name"))
    if location_id:
        attributes["fhir_location_id"] = location_id
    if location_name:
        attributes["fhir_location_name"] = location_name

    service_id = _clean_str(data.get("healthcare_service_id"))
    service_name = _clean_str(data.get("healthcare_service_name"))
    service_category = _clean_str(data.get("service_category"))
    specialty = _clean_str(data.get("specialty"))
    if service_id:
        attributes["fhir_healthcare_service_id"] = service_id
    if service_name:
        attributes["fhir_healthcare_service_name"] = service_name
    if service_category:
        attributes["fhir_service_category"] = service_category
    if specialty:
        attributes["specialty"] = specialty
    if "appointment_required" in data and data.get("appointment_required") is not None:
        attributes["appointmentRequired"] = _parse_bool(
            data.get("appointment_required"), default=False
        )

    country = _clean_str(data.get("country")) or "NG"
    address = format_address(
        address_line=_clean_str(data.get("address_line")),
        city=_clean_str(data.get("city")),
        state=_clean_str(data.get("state")),
        postal_code=_clean_str(data.get("postal_code")),
        country=country,
    )

    return ProviderCanonical(
        id=org_id,
        external_id=org_id,
        name=name,
        type=provider_type,
        address=address,
        phone=_clean_str(data.get("phone")),
        email=_clean_str(data.get("email")),
        latitude=_parse_float(data.get("latitude")),
        longitude=_parse_float(data.get("longitude")),
        attributes=attributes,
        active=_parse_bool(data.get("active"), default=True),
        source=source,
    )
