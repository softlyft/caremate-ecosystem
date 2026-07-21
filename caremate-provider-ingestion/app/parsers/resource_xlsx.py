from __future__ import annotations

import io
from typing import Any

import pandas as pd


def iter_resource_xlsx_rows(content: bytes) -> list[dict[str, Any]]:
    """Read all letter sheets; each data row is a dict of FHIR-field columns."""
    import math

    def is_present(value: Any) -> bool:
        if value is None:
            return False
        if isinstance(value, float) and math.isnan(value):
            return False
        return bool(str(value).strip())

    book = pd.read_excel(io.BytesIO(content), sheet_name=None, engine="openpyxl")
    rows: list[dict[str, Any]] = []
    for sheet_name, df in book.items():
        cleaned = df.where(pd.notnull(df), None)
        for index, raw in enumerate(cleaned.to_dict(orient="records"), start=2):
            if not any(is_present(v) for v in raw.values()):
                continue
            normalized: dict[str, Any] = {}
            for key, value in raw.items():
                if value is None or (isinstance(value, float) and math.isnan(value)):
                    normalized[key] = None
                elif hasattr(value, "item") and not isinstance(value, (bytes, str)):
                    try:
                        item = value.item()
                        normalized[key] = None if isinstance(item, float) and math.isnan(item) else item
                    except Exception:  # noqa: BLE001
                        normalized[key] = value
                else:
                    normalized[key] = value
            normalized["_sheet"] = str(sheet_name)
            normalized["_row"] = index
            rows.append(normalized)
    return rows
