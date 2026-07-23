from __future__ import annotations

import pytest

from app.mappers.resource_rows import (
    map_healthcare_service_row,
    map_location_row,
    map_organization_row,
)

ORG_UUID = "11111111-1111-4111-8111-111111111111"
LOC_UUID = "22222222-2222-4222-8222-222222222222"
HS_UUID = "33333333-3333-4333-8333-333333333333"


class TestMapOrganizationRow:
    def test_maps_insert_without_uuid(self):
        mapped = map_organization_row(
            {
                "name": "Lagos General",
                "active": True,
                "type": (
                    '[{"coding":[{"system":"https://getcaremate.com/fhir/CodeSystem/provider-type",'
                    '"code":"hospital"}]}]'
                ),
                "contact": '{"telecom":[{"system":"phone","value":"+234800"}]}',
            },
            source="test",
        )
        assert mapped["id"] is None
        assert mapped["name"] == "Lagos General"
        assert mapped["provider_type"] == "hospital"
        assert mapped["phone"] == "+234800"
        assert mapped["resource"]["resourceType"] == "Organization"

    def test_maps_update_when_id_is_uuid(self):
        mapped = map_organization_row(
            {"id": ORG_UUID, "name": "Update Me"},
            source="test",
        )
        assert mapped["id"] == ORG_UUID
        assert mapped["resource"]["id"] == ORG_UUID

    def test_requires_name(self):
        with pytest.raises(ValueError, match="organization name"):
            map_organization_row({"name": "  "}, source="test")


class TestMapLocationRow:
    def test_skips_orphan_without_org_uuid(self):
        assert map_location_row({"name": "Wing A", "managingOrganization": "ORG-1"}, source="t") is None
        assert map_location_row({"name": "Wing A"}, source="t") is None

    def test_maps_location_with_org_reference(self):
        mapped = map_location_row(
            {
                "id": LOC_UUID,
                "name": "Main campus",
                "managingOrganization": {"reference": f"Organization/{ORG_UUID}"},
                "position": '{"latitude":6.45,"longitude":3.39}',
                "address": '{"text":"12 Marina"}',
                "contact": '{"telecom":[{"system":"email","value":"a@b.c"}]}',
                "characteristics": (
                    '[{"coding":[{"system":"https://getcaremate.com/fhir/StructureDefinition/distance-km",'
                    '"display":"1.5"}]}]'
                ),
            },
            source="test",
        )
        assert mapped is not None
        assert mapped["id"] == LOC_UUID
        assert mapped["organization_id"] == ORG_UUID
        assert mapped["latitude"] == 6.45
        assert mapped["longitude"] == 3.39
        assert mapped["address"] == "12 Marina"
        assert mapped["email"] == "a@b.c"
        assert mapped["distance_km"] == 1.5

    def test_requires_location_name(self):
        with pytest.raises(ValueError, match="location name"):
            map_location_row(
                {
                    "name": "",
                    "managingOrganization": {"reference": f"Organization/{ORG_UUID}"},
                },
                source="t",
            )


class TestMapHealthcareServiceRow:
    def test_skips_orphan_without_location_uuid(self):
        assert map_healthcare_service_row({"name": "ER", "location": "LOC-1"}, source="t") is None

    def test_maps_service_with_location_reference(self):
        mapped = map_healthcare_service_row(
            {
                "id": HS_UUID,
                "name": "Emergency",
                "location": {"reference": f"Location/{LOC_UUID}"},
                "type": (
                    '[{"coding":[{"system":"https://getcaremate.com/fhir/CodeSystem/provider-type",'
                    '"code":"hospital"}]}]'
                ),
                "active": False,
            },
            source="test",
        )
        assert mapped is not None
        assert mapped["id"] == HS_UUID
        assert mapped["location_id"] == LOC_UUID
        assert mapped["organization_id"] is None
        assert mapped["service_type"] == "hospital"
        assert mapped["active"] is False

    def test_requires_service_name(self):
        with pytest.raises(ValueError, match="healthcare service name"):
            map_healthcare_service_row(
                {
                    "name": " ",
                    "location": {"reference": f"Location/{LOC_UUID}"},
                },
                source="t",
            )
