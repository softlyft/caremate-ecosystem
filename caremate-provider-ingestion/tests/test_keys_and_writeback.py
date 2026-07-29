from __future__ import annotations

import io

import pandas as pd

from app.keys import (
    normalize_key,
    organization_temp_keys,
    resolve_mapped_id,
    slugify,
)
from app.workbook_writeback import apply_cell_updates, organization_reference


class TestSlugify:
    def test_slugifies_org_name(self):
        assert slugify("Beachland Specialist Hospital") == "beachland-specialist-hospital"
        assert normalize_key("  Beachland Specialist Hospital ") == "beachland-specialist-hospital"


class TestOrganizationTempKeys:
    def test_prefers_code_and_includes_name_slug(self):
        keys = organization_temp_keys(
            {
                "name": "Beachland Specialist Hospital",
                "identifier": '[{"code":"org-beachland"}]',
            }
        )
        assert "org-beachland" in keys
        assert "beachland-specialist-hospital" in keys

    def test_uuid_hint_does_not_become_temp_key(self):
        keys = organization_temp_keys(
            {
                "id": "11111111-1111-4111-8111-111111111111",
                "name": "Known Org",
            }
        )
        assert "11111111-1111-4111-8111-111111111111" not in keys
        assert "known-org" in keys


class TestResolveMappedId:
    def test_resolves_slug_and_uuid(self):
        mapping = {
            "beachland-specialist-hospital": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            "org-beachland": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        }
        assert resolve_mapped_id("beachland-specialist-hospital", mapping) == (
            "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        )
        assert resolve_mapped_id("org-beachland", mapping) == (
            "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        )
        assert (
            resolve_mapped_id("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", mapping)
            == "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        )
        assert resolve_mapped_id("missing", mapping) is None


class TestWorkbookWriteback:
    def test_writes_id_and_managing_org(self):
        frame = pd.DataFrame(
            [
                {
                    "id": "org-beachland",
                    "name": "Beachland Specialist Hospital",
                    "managingOrganization": "beachland-specialist-hospital",
                }
            ]
        )
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
            frame.to_excel(writer, sheet_name="B", index=False)
        content = buffer.getvalue()

        org_uuid = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
        updated = apply_cell_updates(
            content,
            [
                {
                    "sheet": "B",
                    "row": 2,
                    "values": {
                        "id": org_uuid,
                        "managingOrganization": organization_reference(org_uuid),
                    },
                }
            ],
        )
        rows = pd.read_excel(io.BytesIO(updated), sheet_name="B").to_dict(orient="records")
        assert rows[0]["id"] == org_uuid
        assert org_uuid in str(rows[0]["managingOrganization"])

    def test_creates_missing_id_column(self):
        frame = pd.DataFrame([{"name": "Clinic One", "active": True}])
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
            frame.to_excel(writer, sheet_name="A", index=False)
        content = buffer.getvalue()
        org_uuid = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
        updated = apply_cell_updates(
            content,
            [{"sheet": "A", "row": 2, "values": {"id": org_uuid}}],
        )
        rows = pd.read_excel(io.BytesIO(updated), sheet_name="A").to_dict(orient="records")
        assert "id" in rows[0]
        assert rows[0]["id"] == org_uuid
