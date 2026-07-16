from __future__ import annotations

import json
import re
from typing import Any
from uuid import UUID

_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


def is_uuid(value: Any) -> bool:
    if value is None:
        return False
    text = str(value).strip()
    if not text or not _UUID_RE.match(text):
        return False
    try:
        UUID(text)
        return True
    except ValueError:
        return False


def parse_json_cell(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (dict, list, bool, int, float)):
        if isinstance(value, float) and str(value) == "nan":
            return None
        return value
    text = str(value).strip()
    if not text or text.lower() == "nan":
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Tolerate trailing commas / single quotes lightly
        try:
            return json.loads(text.replace("'", '"'))
        except json.JSONDecodeError:
            return text


def caremate_id_from_identifier(value: Any) -> str | None:
    """Business / Excel identifier code (may be a UUID PK once copied from portal)."""
    parsed = parse_json_cell(value)
    if isinstance(parsed, list) and parsed:
        first = parsed[0]
        if isinstance(first, dict):
            code = first.get("code")
            if isinstance(code, str) and code.strip() and code != "<system-generated>":
                return code.strip()
    if isinstance(parsed, dict):
        code = parsed.get("code")
        if isinstance(code, str) and code.strip() and code != "<system-generated>":
            return code.strip()
    if isinstance(parsed, str) and parsed.strip() and parsed.strip() != "<system-generated>":
        return parsed.strip()
    return None


def resource_id_hint(row: dict[str, Any]) -> str | None:
    """Prefer explicit id cell, else identifier.code. UUID ⇒ update; anything else ⇒ insert."""
    for key in ("id", "Id", "ID"):
        raw = row.get(key)
        if raw is None:
            continue
        text = str(raw).strip()
        if text and text.lower() != "nan" and text != "<system-generated>":
            return text
    return caremate_id_from_identifier(row.get("identifier"))


def provider_type_from_CodeableConcept(value: Any) -> str | None:
    parsed = parse_json_cell(value)
    concepts = parsed if isinstance(parsed, list) else [parsed] if isinstance(parsed, dict) else []
    for concept in concepts:
        if not isinstance(concept, dict):
            continue
        for coding in concept.get("coding") or []:
            if not isinstance(coding, dict):
                continue
            system = str(coding.get("system") or "")
            code = coding.get("code")
            if code and "provider-type" in system:
                return str(code).strip()
        text = concept.get("text")
        if isinstance(text, str) and text.strip():
            return _type_from_text(text)
    return None


def _type_from_text(text: str) -> str:
    t = text.lower()
    mapping = [
        ("hospital", "hospital"),
        ("pharmac", "pharmacy"),
        ("lab", "laboratory"),
        ("dental", "dentist"),
        ("dentist", "dentist"),
        ("mental", "mental_health"),
        ("ambulance", "ambulance"),
        ("blood", "blood_bank"),
        ("tele", "telemedicine"),
        ("clinic", "clinic"),
    ]
    for needle, code in mapping:
        if needle in t:
            return code
    return "clinic"


def telecom_value(contact: Any, system: str) -> str | None:
    parsed = parse_json_cell(contact)
    if not isinstance(parsed, dict):
        return None
    for item in parsed.get("telecom") or []:
        if isinstance(item, dict) and item.get("system") == system:
            value = item.get("value")
            if isinstance(value, str) and value.strip():
                return value.strip()
    return None


def format_address(address: Any) -> str | None:
    parsed = parse_json_cell(address)
    if not isinstance(parsed, dict):
        return None
    if isinstance(parsed.get("text"), str) and parsed["text"].strip():
        return parsed["text"].strip()
    parts = [
        *(parsed.get("line") or []),
        parsed.get("city"),
        parsed.get("state"),
        parsed.get("postalCode") or parsed.get("postal_code"),
        parsed.get("country"),
    ]
    cleaned = [str(p).strip() for p in parts if p is not None and str(p).strip()]
    return ", ".join(cleaned) if cleaned else None


def reference_id(value: Any, resource_type: str | None = None) -> str | None:
    parsed = parse_json_cell(value)
    if isinstance(parsed, list) and parsed:
        parsed = parsed[0]
    if isinstance(parsed, dict):
        ref = parsed.get("reference")
        if isinstance(ref, str) and ref.strip():
            if "/" in ref:
                return ref.split("/", 1)[1].strip()
            return ref.strip()
        ident = caremate_id_from_identifier(parsed.get("identifier"))
        if ident:
            return ident
    if isinstance(parsed, str) and parsed.strip():
        text = parsed.strip()
        if resource_type and text.startswith(f"{resource_type}/"):
            return text.split("/", 1)[1]
        return text
    return None


def distance_km_from_characteristics(value: Any) -> float | None:
    parsed = parse_json_cell(value)
    items = parsed if isinstance(parsed, list) else []
    for item in items:
        if not isinstance(item, dict):
            continue
        for coding in item.get("coding") or []:
            if not isinstance(coding, dict):
                continue
            system = str(coding.get("system") or "")
            if "distance-km" in system:
                display = coding.get("display")
                try:
                    return float(display)
                except (TypeError, ValueError):
                    pass
        text = str(item.get("text") or "")
        match = re.search(r"([\d.]+)", text)
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                pass
    return None


def position_coords(value: Any) -> tuple[float | None, float | None]:
    parsed = parse_json_cell(value)
    if not isinstance(parsed, dict):
        return None, None
    lat = parsed.get("latitude")
    lng = parsed.get("longitude")
    try:
        latitude = float(lat) if lat is not None else None
    except (TypeError, ValueError):
        latitude = None
    try:
        longitude = float(lng) if lng is not None else None
    except (TypeError, ValueError):
        longitude = None
    return latitude, longitude
