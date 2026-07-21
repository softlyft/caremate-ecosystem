from __future__ import annotations

import io

import numpy as np
import pandas as pd

from app.parsers.resource_xlsx import iter_resource_xlsx_rows


def _xlsx_from_frame(frame: pd.DataFrame, sheet_name: str = "Organizations") -> bytes:
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        frame.to_excel(writer, sheet_name=sheet_name, index=False)
    return buffer.getvalue()


class TestResourceXlsxBranches:
    def test_skips_fully_blank_rows(self):
        frame = pd.DataFrame(
            [
                {"name": "Lagos General", "active": True},
                {"name": None, "active": None},
                {"name": "  ", "active": None},
            ]
        )
        rows = iter_resource_xlsx_rows(_xlsx_from_frame(frame))
        assert len(rows) == 1
        assert rows[0]["name"] == "Lagos General"

    def test_normalizes_numpy_scalars_and_nan(self):
        frame = pd.DataFrame(
            [
                {
                    "name": "Clinic",
                    "beds": np.int64(12),
                    "score": np.float64(float("nan")),
                    "flag": np.bool_(True),
                }
            ]
        )
        rows = iter_resource_xlsx_rows(_xlsx_from_frame(frame))
        assert len(rows) == 1
        assert rows[0]["beds"] == 12
        assert rows[0]["score"] is None
        assert rows[0]["flag"] is True

    def test_keeps_plain_python_values(self):
        frame = pd.DataFrame([{"name": "X", "value": 1.5, "note": "ok"}])
        rows = iter_resource_xlsx_rows(_xlsx_from_frame(frame))
        assert rows[0]["value"] == 1.5
        assert rows[0]["note"] == "ok"
        assert rows[0]["_sheet"] == "Organizations"
        assert rows[0]["_row"] == 2
