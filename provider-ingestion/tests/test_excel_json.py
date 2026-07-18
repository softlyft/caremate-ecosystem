from __future__ import annotations

from app.excel_json import (
    caremate_id_from_identifier,
    distance_km_from_characteristics,
    format_address,
    is_uuid,
    parse_json_cell,
    position_coords,
    provider_type_from_CodeableConcept,
    reference_id,
    resource_id_hint,
    telecom_value,
)


class TestIsUuid:
    def test_accepts_valid_uuids(self):
        assert is_uuid("550e8400-e29b-41d4-a716-446655440000")
        assert is_uuid(" 550E8400-E29B-41D4-A716-446655440000 ")

    def test_rejects_invalid_values(self):
        assert is_uuid(None) is False
        assert is_uuid("") is False
        assert is_uuid("not-a-uuid") is False
        assert is_uuid("550e8400-e29b-41d4-a716") is False


class TestParseJsonCell:
    def test_passthrough_and_nan(self):
        assert parse_json_cell({"a": 1}) == {"a": 1}
        assert parse_json_cell([1, 2]) == [1, 2]
        assert parse_json_cell(True) is True
        assert parse_json_cell(float("nan")) is None
        assert parse_json_cell(None) is None
        assert parse_json_cell("  ") is None

    def test_parses_json_strings_and_single_quotes(self):
        assert parse_json_cell('{"code":"x"}') == {"code": "x"}
        assert parse_json_cell("{'code': 'x'}") == {"code": "x"}
        assert parse_json_cell("plain text") == "plain text"


class TestIdentifiersAndHints:
    def test_caremate_id_from_identifier_shapes(self):
        assert caremate_id_from_identifier([{"code": "ORG-1"}]) == "ORG-1"
        assert caremate_id_from_identifier({"code": "ORG-2"}) == "ORG-2"
        assert caremate_id_from_identifier("ORG-3") == "ORG-3"
        assert caremate_id_from_identifier([{"code": "<system-generated>"}]) is None
        assert caremate_id_from_identifier([]) is None

    def test_resource_id_hint_prefers_id_cell(self):
        assert resource_id_hint({"id": "abc"}) == "abc"
        assert resource_id_hint({"Id": "  "}) is None
        assert resource_id_hint({"identifier": [{"code": "from-ident"}]}) == "from-ident"


class TestCodeableConceptAndTelecom:
    def test_provider_type_from_coding_system(self):
        value = [
            {
                "coding": [
                    {
                        "system": "https://caremate.app/fhir/CodeSystem/provider-type",
                        "code": "hospital",
                    }
                ]
            }
        ]
        assert provider_type_from_CodeableConcept(value) == "hospital"

    def test_provider_type_from_text(self):
        assert provider_type_from_CodeableConcept({"text": "Community Pharmacy"}) == "pharmacy"
        assert provider_type_from_CodeableConcept({"text": "Diagnostic Lab"}) == "laboratory"
        assert provider_type_from_CodeableConcept({"text": "Something else"}) == "clinic"
        assert provider_type_from_CodeableConcept(None) is None

    def test_telecom_value(self):
        contact = {"telecom": [{"system": "phone", "value": " +234 "}, {"system": "email", "value": "a@b.c"}]}
        assert telecom_value(contact, "phone") == "+234"
        assert telecom_value(contact, "email") == "a@b.c"
        assert telecom_value("not-json-object", "phone") is None


class TestAddressPositionDistance:
    def test_format_address_text_and_parts(self):
        assert format_address({"text": " 12 Marina "}) == "12 Marina"
        assert (
            format_address(
                {
                    "line": ["1 Broad"],
                    "city": "Lagos",
                    "state": "LA",
                    "postalCode": "100001",
                    "country": "NG",
                }
            )
            == "1 Broad, Lagos, LA, 100001, NG"
        )
        assert format_address("not-an-object") is None

    def test_position_coords(self):
        assert position_coords({"latitude": "6.5", "longitude": "3.4"}) == (6.5, 3.4)
        assert position_coords({"latitude": "x", "longitude": None}) == (None, None)
        assert position_coords(None) == (None, None)

    def test_distance_km_from_characteristics(self):
        by_system = [
            {
                "coding": [
                    {
                        "system": "https://caremate.app/fhir/StructureDefinition/distance-km",
                        "display": "2.5",
                    }
                ]
            }
        ]
        assert distance_km_from_characteristics(by_system) == 2.5
        assert distance_km_from_characteristics([{"text": "about 3.25 km"}]) == 3.25
        assert distance_km_from_characteristics([]) is None


class TestReferenceId:
    def test_extracts_from_reference_object_and_string(self):
        assert reference_id({"reference": "Organization/abc-123"}) == "abc-123"
        assert reference_id("Organization/xyz", "Organization") == "xyz"
        assert reference_id("bare-id") == "bare-id"
        assert reference_id([{"reference": "Location/loc-1"}]) == "loc-1"
        assert reference_id({"identifier": [{"code": "legacy"}]}) == "legacy"
        assert reference_id(None) is None
