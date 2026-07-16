from __future__ import annotations

import re

from app.canonical import PROVIDER_TYPES

# Sheet / filename tokens → CareMate provider type
_SHEET_ALIASES: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"hospital", re.I), "hospital"),
    (re.compile(r"health[_\s-]?center|clinic", re.I), "clinic"),
    (re.compile(r"dental|dentist", re.I), "dentist"),
    (re.compile(r"eye|ophthalm|optometr", re.I), "clinic"),
    (re.compile(r"pharmac", re.I), "pharmacy"),
    (re.compile(r"lab", re.I), "laboratory"),
    (re.compile(r"blood", re.I), "blood_bank"),
    (re.compile(r"ambulance", re.I), "ambulance"),
    (re.compile(r"mental", re.I), "mental_health"),
    (re.compile(r"tele", re.I), "telemedicine"),
]


def sheet_name_to_type(sheet_name: str) -> tuple[str, dict]:
    """
    Map a workbook sheet or CSV category hint to CareMate type.
    Returns (type, extra_attributes) — e.g. eye → clinic + specialty.
    """
    name = (sheet_name or "").strip()
    attrs: dict = {}

    if re.search(r"eye|ophthalm|optometr", name, re.I):
        attrs["specialty"] = "ophthalmology"

    for pattern, provider_type in _SHEET_ALIASES:
        if pattern.search(name):
            if provider_type not in PROVIDER_TYPES:
                return "clinic", attrs
            return provider_type, attrs

    return "clinic", attrs


def infer_type_from_filename(filename: str) -> tuple[str, dict] | None:
    stem = filename.rsplit("/", 1)[-1]
    stem = stem.rsplit(".", 1)[0]
    # ng_lagos_hospitals → hospitals
    for token in reversed(stem.replace("-", "_").split("_")):
        if token.lower() in {"ng", "lagos", "providers", "provider"}:
            continue
        mapped = sheet_name_to_type(token)
        if mapped[0] != "clinic" or mapped[1]:
            return mapped
        if re.search(r"clinic|center|centre", token, re.I):
            return mapped
    return None
