from __future__ import annotations

from typing import Any

from app.projection import rebuild_projection_for_location, rebuild_projections_for_organization

ORG_ID = "11111111-1111-4111-8111-111111111111"
LOC_ID = "22222222-2222-4222-8222-222222222222"
HS_ID = "33333333-3333-4333-8333-333333333333"


class FakeWriter:
    def __init__(self) -> None:
        self.upserts: list[tuple[str, list[dict[str, Any]]]] = []
        self.soft_deletes: list[list[str]] = []
        self.tables: dict[str, list[dict[str, Any]]] = {
            "provider_locations": [
                {
                    "id": LOC_ID,
                    "organization_id": ORG_ID,
                    "name": "Main campus",
                    "status": "active",
                    "address": "12 Marina",
                    "phone": None,
                    "email": None,
                    "latitude": 6.45,
                    "longitude": 3.39,
                    "distance_km": 1.2,
                    "source": "csv_ingest",
                }
            ],
            "provider_organizations": [
                {
                    "id": ORG_ID,
                    "name": "Lagos General",
                    "active": True,
                    "resource": {
                        "type": [
                            {
                                "coding": [
                                    {
                                        "system": "https://getcaremate.com/fhir/CodeSystem/provider-type",
                                        "code": "hospital",
                                    }
                                ]
                            }
                        ],
                        "contact": {
                            "telecom": [
                                {"system": "phone", "value": "+234800"},
                                {"system": "email", "value": "info@example.com"},
                            ]
                        },
                    },
                }
            ],
            "provider_healthcare_services": [
                {
                    "id": HS_ID,
                    "name": "Emergency",
                    "service_type": "hospital",
                    "active": True,
                    "location_id": LOC_ID,
                }
            ],
        }

    def select(self, table: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        rows = list(self.tables.get(table, []))
        params = params or {}
        if "id" in params and str(params["id"]).startswith("eq."):
            wanted = str(params["id"])[3:]
            rows = [r for r in rows if r.get("id") == wanted]
        if "organization_id" in params and str(params["organization_id"]).startswith("eq."):
            wanted = str(params["organization_id"])[3:]
            rows = [r for r in rows if r.get("organization_id") == wanted]
        if "location_id" in params and str(params["location_id"]).startswith("eq."):
            wanted = str(params["location_id"])[3:]
            rows = [r for r in rows if r.get("location_id") == wanted]
        return rows

    def upsert(self, table: str, rows: list[dict[str, Any]]) -> None:
        self.upserts.append((table, rows))

    def soft_delete_providers_by_ids(self, ids: list[str]) -> None:
        self.soft_deletes.append(ids)


class TestProjection:
    def test_rebuilds_nearby_pin_from_location_org_and_services(self):
        writer = FakeWriter()
        row = rebuild_projection_for_location(writer, LOC_ID)  # type: ignore[arg-type]
        assert row is not None
        assert row["id"] == LOC_ID
        assert row["name"] == "Lagos General — Main campus"
        assert row["type"] == "hospital"
        assert row["phone"] == "+234800"
        assert row["email"] == "info@example.com"
        assert row["attributes"]["services"][0]["id"] == HS_ID
        assert writer.upserts[0][0] == "providers"
        assert writer.soft_deletes == [[ORG_ID]]

    def test_returns_none_when_location_missing(self):
        writer = FakeWriter()
        assert rebuild_projection_for_location(writer, "missing") is None  # type: ignore[arg-type]

    def test_uses_org_type_when_no_services(self):
        writer = FakeWriter()
        writer.tables["provider_healthcare_services"] = []
        row = rebuild_projection_for_location(writer, LOC_ID)  # type: ignore[arg-type]
        assert row is not None
        assert row["type"] == "hospital"
        assert row["healthcare_service_ids"] == []

    def test_rebuilds_all_locations_for_organization(self):
        writer = FakeWriter()
        count = rebuild_projections_for_organization(writer, ORG_ID)  # type: ignore[arg-type]
        assert count == 1
