from __future__ import annotations

import re
from typing import Any

from app.excel_json import is_uuid, resource_id_hint


_NON_ALNUM = re.compile(r"[^a-z0-9]+")


def slugify(value: str) -> str:
    """beachland specialist hospital → beachland-specialist-hospital"""
    text = str(value or "").strip().casefold()
    text = _NON_ALNUM.sub("-", text).strip("-")
    return text


def normalize_key(value: str) -> str:
    """Stable lookup key: slugify after trim."""
    return slugify(value)


def organization_temp_keys(row: dict[str, Any]) -> list[str]:
    """
    Temporary keys used before/until a UUID exists.
    Prefer explicit spreadsheet code (id / identifier.code); always include slugified name.
    """
    keys: list[str] = []
    hint = resource_id_hint(row)
    if hint and not is_uuid(hint):
        keys.append(hint.strip())
        keys.append(normalize_key(hint))

    name = str(row.get("name") or "").strip()
    if name:
        keys.append(normalize_key(name))
        keys.append(name.casefold())

    # Deduplicate while preserving order
    seen: set[str] = set()
    out: list[str] = []
    for key in keys:
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(key)
    return out


def location_temp_keys(row: dict[str, Any]) -> list[str]:
    keys: list[str] = []
    hint = resource_id_hint(row)
    if hint and not is_uuid(hint):
        keys.append(hint.strip())
        keys.append(normalize_key(hint))
    name = str(row.get("name") or "").strip()
    if name:
        keys.append(normalize_key(name))
    seen: set[str] = set()
    out: list[str] = []
    for key in keys:
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(key)
    return out


def resolve_mapped_id(raw_ref: str | None, key_to_uuid: dict[str, str]) -> str | None:
    if not raw_ref:
        return None
    text = str(raw_ref).strip()
    if not text:
        return None
    if is_uuid(text):
        return text
    for candidate in (text, normalize_key(text), text.casefold()):
        if candidate in key_to_uuid:
            return key_to_uuid[candidate]
    return None
