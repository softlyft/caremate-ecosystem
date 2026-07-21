from __future__ import annotations

import json
from typing import Protocol

from app.canonical import ProviderCanonical

PROVIDER_TYPE_SYSTEM = "https://caremate.app/fhir/CodeSystem/provider-type"
ATTRIBUTES_EXTENSION = "https://caremate.app/fhir/StructureDefinition/provider-attributes"
# HL7 service-category codes when CSV does not supply a category
DEFAULT_SERVICE_CATEGORY_SYSTEM = "http://terminology.hl7.org/CodeSystem/service-category"
SERVICE_CATEGORY_BY_TYPE: dict[str, tuple[str, str]] = {
    "hospital": ("27", "Specialist Medical"),
    "clinic": ("17", "General Practice"),
    "pharmacy": ("19", "Pharmacy"),
    "laboratory": ("12", "Pathology/Microbiology"),
    "imaging_centre": ("12", "Pathology/Microbiology"),
    "telemedicine": ("17", "General Practice"),
    "blood_bank": ("12", "Pathology/Microbiology"),
    "ambulance": ("6", "Emergency Department"),
    "insurance": ("17", "General Practice"),
    "dentist": ("8", "Dentist"),
    "eye_care": ("17", "General Practice"),
    "mental_health": ("15", "Mental Health"),
    "home_care": ("17", "General Practice"),
    "medical_equipment": ("17", "General Practice"),
    "government_health": ("17", "General Practice"),
    "ngo": ("17", "General Practice"),
}


class FhirPublisher(Protocol):
    def publish(self, providers: list[ProviderCanonical]) -> None: ...


class NoOpFhirPublisher:
    """Placeholder until a FHIR server is wired. Keeps the pipeline FHIR-ready."""

    def publish(self, providers: list[ProviderCanonical]) -> None:
        return None


def build_provider_fhir_bundle(providers: list[ProviderCanonical]) -> dict:
    """
    FHIR Bundle: Organization (who) + Location (where) + HealthcareService (what).
    Not posted yet — stub for future FHIR server publish.
    """
    entries: list[dict] = []
    for provider in providers:
        telecom: list[dict] = []
        if provider.phone:
            telecom.append({"system": "phone", "value": provider.phone, "use": "work"})
        if provider.email:
            telecom.append({"system": "email", "value": provider.email, "use": "work"})

        address = None
        if provider.address:
            address = {"text": provider.address, "country": "NG"}

        # Drop FHIR helper keys from the CareMate attributes extension payload
        attr_payload = {
            k: v
            for k, v in provider.attributes.items()
            if not str(k).startswith("fhir_")
        }
        org_extensions = []
        if attr_payload:
            org_extensions.append(
                {
                    "url": ATTRIBUTES_EXTENSION,
                    "valueString": json.dumps(attr_payload),
                }
            )

        org = {
            "resourceType": "Organization",
            "id": provider.external_id,
            "active": provider.active,
            "name": provider.name,
            "type": [
                {
                    "coding": [
                        {
                            "system": PROVIDER_TYPE_SYSTEM,
                            "code": provider.type,
                        }
                    ]
                }
            ],
            "telecom": telecom,
            "address": [address] if address else [],
            "extension": org_extensions,
        }
        entries.append(
            {
                "fullUrl": f"urn:uuid:{provider.external_id}",
                "resource": org,
            }
        )

        loc_id = str(provider.attributes.get("fhir_location_id") or f"loc-{provider.external_id}")
        loc_name = str(provider.attributes.get("fhir_location_name") or provider.name)
        location: dict = {
            "resourceType": "Location",
            "id": loc_id,
            "status": "active" if provider.active else "inactive",
            "name": loc_name,
            "mode": "instance",
            "telecom": telecom,
            "managingOrganization": {"reference": f"Organization/{provider.external_id}"},
        }
        if address:
            location["address"] = address
        if provider.latitude is not None and provider.longitude is not None:
            location["position"] = {
                "latitude": provider.latitude,
                "longitude": provider.longitude,
            }
        entries.append(
            {
                "fullUrl": f"urn:uuid:{loc_id}",
                "resource": location,
            }
        )

        hs_id = str(
            provider.attributes.get("fhir_healthcare_service_id")
            or f"hs-{provider.external_id}"
        )
        hs_name = str(
            provider.attributes.get("fhir_healthcare_service_name") or provider.name
        )
        category_code = provider.attributes.get("fhir_service_category")
        if isinstance(category_code, str) and category_code.strip():
            category = [
                {
                    "coding": [
                        {
                            "system": DEFAULT_SERVICE_CATEGORY_SYSTEM,
                            "code": category_code.strip(),
                        }
                    ]
                }
            ]
        else:
            code, display = SERVICE_CATEGORY_BY_TYPE.get(
                provider.type, ("17", "General Practice")
            )
            category = [
                {
                    "coding": [
                        {
                            "system": DEFAULT_SERVICE_CATEGORY_SYSTEM,
                            "code": code,
                            "display": display,
                        }
                    ],
                    "text": display,
                }
            ]

        service_type = [
            {
                "coding": [
                    {
                        "system": PROVIDER_TYPE_SYSTEM,
                        "code": provider.type,
                    }
                ]
            }
        ]

        specialty = []
        specialty_code = provider.attributes.get("specialty")
        if isinstance(specialty_code, str) and specialty_code.strip():
            specialty = [{"text": specialty_code.strip()}]

        appointment_required = provider.attributes.get("appointmentRequired")
        healthcare_service: dict = {
            "resourceType": "HealthcareService",
            "id": hs_id,
            "active": provider.active,
            "providedBy": {"reference": f"Organization/{provider.external_id}"},
            "category": category,
            "type": service_type,
            "specialty": specialty,
            "location": [{"reference": f"Location/{loc_id}"}],
            "name": hs_name,
            "telecom": telecom,
        }
        if isinstance(appointment_required, bool):
            healthcare_service["appointmentRequired"] = appointment_required

        entries.append(
            {
                "fullUrl": f"urn:uuid:{hs_id}",
                "resource": healthcare_service,
            }
        )

    return {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": entries,
    }


# Back-compat alias
build_organization_location_bundle = build_provider_fhir_bundle
