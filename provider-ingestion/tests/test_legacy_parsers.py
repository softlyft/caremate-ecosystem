from __future__ import annotations

import io

import pandas as pd
import pytest

from app.parsers import parse_csv_bytes, parse_xlsx_bytes


def test_parse_csv_bytes_with_filename_inference():
    csv = (
        "organization_id,organization_name,phone\n"
        "org-1,Lagos General,+234\n"
    ).encode()
    providers = parse_csv_bytes(csv, filename="ng_lagos_hospitals.csv", source="test")
    assert len(providers) == 1
    assert providers[0].type == "hospital"
    assert providers[0].name == "Lagos General"


def test_parse_csv_bytes_type_override_and_row_error():
    csv = b"organization_id,organization_name\n,Missing Id\n"
    with pytest.raises(ValueError, match="CSV row 2"):
        parse_csv_bytes(csv, filename="x.csv", source="test", type_override="pharmacy")


def test_parse_xlsx_bytes_by_sheet_name():
    frame = pd.DataFrame(
        [
            {"organization_id": "org-1", "organization_name": "City Pharmacy"},
            {"organization_id": None, "organization_name": None},
        ]
    )
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        frame.to_excel(writer, sheet_name="Pharmacies", index=False)
    providers = parse_xlsx_bytes(buffer.getvalue(), source="test")
    assert len(providers) == 1
    assert providers[0].type == "pharmacy"


def test_parse_xlsx_bytes_surfaces_row_errors():
    frame = pd.DataFrame([{"organization_id": "org-1", "organization_name": None}])
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        frame.to_excel(writer, sheet_name="Hospitals", index=False)
    with pytest.raises(ValueError, match="Sheet 'Hospitals' row 2"):
        parse_xlsx_bytes(buffer.getvalue(), source="test")
