from __future__ import annotations

import pytest

from app.canonical import PROVIDER_TYPES, ProviderCanonical
from app.mappers.fhir_columns import (
    format_address,
    normalize_row_keys,
    row_to_canonical,
)
from app.mappers.sheet_type import infer_type_from_filename, sheet_name_to_type


class TestSheetType:
    def test_maps_common_sheet_names(self):
        assert sheet_name_to_type("Lagos Hospitals")[0] == "hospital"
        assert sheet_name_to_type("Community Clinic")[0] == "clinic"
        assert sheet_name_to_type("Pharmacies")[0] == "pharmacy"
        assert sheet_name_to_type("Blood Bank")[0] == "blood_bank"
        assert sheet_name_to_type("Ambulance Unit")[0] == "ambulance"
        assert sheet_name_to_type("Mental Health")[0] == "mental_health"
        assert sheet_name_to_type("Telemedicine Hub")[0] == "telemedicine"
        assert sheet_name_to_type("Dental Care")[0] == "dentist"
        assert sheet_name_to_type("Pathology Lab")[0] == "laboratory"

    def test_eye_specialty_attributes(self):
        provider_type, attrs = sheet_name_to_type("Eye / Ophthalmology Clinic")
        assert provider_type == "eye_care"
        assert attrs["specialty"] == "ophthalmology"
        assert sheet_name_to_type("Imaging Centre")[0] == "imaging_centre"
        assert sheet_name_to_type("HMO Plans")[0] == "insurance"
        assert sheet_name_to_type("Home Care Nurses")[0] == "home_care"
        assert sheet_name_to_type("Medical Equipment")[0] == "medical_equipment"
        assert sheet_name_to_type("Government Health Office")[0] == "government_health"
        assert sheet_name_to_type("Community NGO")[0] == "ngo"

    def test_defaults_unknown_to_clinic(self):
        assert sheet_name_to_type("Miscellaneous") == ("clinic", {})
        assert sheet_name_to_type("") == ("clinic", {})

    def test_infer_type_from_filename(self):
        assert infer_type_from_filename("ng_lagos_hospitals.xlsx")[0] == "hospital"
        assert infer_type_from_filename("providers_pharmacy.csv")[0] == "pharmacy"
        assert infer_type_from_filename("ng_lagos_providers.xlsx") is None


class TestFhirColumns:
    def test_normalize_row_keys_aliases(self):
        row = normalize_row_keys(
            {
                "Org Name": "Lagos General",
                "org_id": "org-1",
                "lat": "6.5",
                "lng": "3.4",
                "Telephone": "+234",
            }
        )
        assert row["organization_name"] == "Lagos General"
        assert row["organization_id"] == "org-1"
        assert row["latitude"] == "6.5"
        assert row["longitude"] == "3.4"
        assert row["phone"] == "+234"

    def test_format_address_parts(self):
        assert (
            format_address(
                address_line="1 Broad",
                city="Lagos",
                state="LA",
                postal_code="100001",
                country="NG",
            )
            == "1 Broad, Lagos, LA, 100001, NG"
        )
        assert (
            format_address(
                address_line=None,
                city=None,
                state=None,
                postal_code=None,
                country=None,
            )
            is None
        )

    def test_row_to_canonical_happy_path(self):
        canonical = row_to_canonical(
            {
                "organization_id": "org-1",
                "organization_name": "Lagos General",
                "address": "12 Marina",
                "city": "Lagos",
                "active": "yes",
                "latitude": "6.45",
                "longitude": "3.39",
                "location_id": "loc-1",
                "location_name": "Main",
                "healthcare_service_id": "hs-1",
                "healthcare_service_name": "ER",
                "service_category": "27",
                "specialty": "trauma",
                "appointment_required": "true",
                "attributes_json": '{"tier":"a"}',
            },
            provider_type="hospital",
            extra_attributes={"region": "SW"},
        )
        assert isinstance(canonical, ProviderCanonical)
        assert canonical.id == "org-1"
        assert canonical.type == "hospital"
        assert canonical.active is True
        assert canonical.latitude == 6.45
        assert canonical.attributes["tier"] == "a"
        assert canonical.attributes["region"] == "SW"
        assert canonical.attributes["fhir_location_id"] == "loc-1"
        assert canonical.attributes["appointmentRequired"] is True
        assert "NG" in (canonical.address or "")

    def test_row_to_canonical_requires_id_and_name(self):
        with pytest.raises(ValueError, match="organization_id"):
            row_to_canonical({"organization_name": "X"}, provider_type="clinic")
        with pytest.raises(ValueError, match="organization_name"):
            row_to_canonical({"organization_id": "1"}, provider_type="clinic")

    def test_row_to_canonical_falls_back_unknown_type_and_bad_json(self):
        canonical = row_to_canonical(
            {
                "organization_id": "org-2",
                "organization_name": "Clinic",
                "attributes_json": "{not-json",
                "active": "inactive",
                "latitude": "bad",
            },
            provider_type="not-a-real-type",
        )
        assert canonical.type == "clinic"
        assert canonical.active is False
        assert canonical.latitude is None
        assert canonical.attributes == {}

    def test_provider_types_catalog(self):
        assert "imaging_centre" in PROVIDER_TYPES
        assert "insurance" in PROVIDER_TYPES
        assert "ngo" in PROVIDER_TYPES
        assert "hospital" in PROVIDER_TYPES
        row = ProviderCanonical(
            id="1",
            external_id="1",
            name="Test",
            type="clinic",
        ).to_supabase_row()
        assert row["deleted_at"] is None
        assert row["name"] == "Test"
        assert "updated_at" in row
