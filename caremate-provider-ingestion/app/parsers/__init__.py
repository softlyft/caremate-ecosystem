from __future__ import annotations

import io
from typing import Any

import pandas as pd

from app.mappers.fhir_columns import row_to_canonical
from app.mappers.sheet_type import infer_type_from_filename, sheet_name_to_type
from app.canonical import ProviderCanonical


def _dataframe_rows(df: pd.DataFrame) -> list[dict[str, Any]]:
    # Replace NaN with None for clean cleaning
    cleaned = df.where(pd.notnull(df), None)
    return cleaned.to_dict(orient="records")


def parse_csv_bytes(
    content: bytes,
    *,
    filename: str,
    source: str,
    type_override: str | None = None,
) -> list[ProviderCanonical]:
    df = pd.read_csv(io.BytesIO(content))
    if type_override:
        provider_type, extra = sheet_name_to_type(type_override)
    else:
        inferred = infer_type_from_filename(filename)
        if inferred:
            provider_type, extra = inferred
        else:
            provider_type, extra = "clinic", {}

    providers: list[ProviderCanonical] = []
    for index, row in enumerate(_dataframe_rows(df), start=2):
        if not any(v is not None and str(v).strip() for v in row.values()):
            continue
        try:
            providers.append(
                row_to_canonical(
                    row,
                    provider_type=provider_type,
                    extra_attributes=extra,
                    source=source,
                )
            )
        except ValueError as exc:
            raise ValueError(f"CSV row {index}: {exc}") from exc
    return providers


def parse_xlsx_bytes(
    content: bytes,
    *,
    source: str,
) -> list[ProviderCanonical]:
    book = pd.read_excel(io.BytesIO(content), sheet_name=None, engine="openpyxl")
    providers: list[ProviderCanonical] = []
    for sheet_name, df in book.items():
        provider_type, extra = sheet_name_to_type(str(sheet_name))
        for index, row in enumerate(_dataframe_rows(df), start=2):
            if not any(v is not None and str(v).strip() for v in row.values()):
                continue
            try:
                providers.append(
                    row_to_canonical(
                        row,
                        provider_type=provider_type,
                        extra_attributes=extra,
                        source=source,
                    )
                )
            except ValueError as exc:
                raise ValueError(f"Sheet '{sheet_name}' row {index}: {exc}") from exc
    return providers
