from __future__ import annotations

from app.canonical import ProviderCanonical
from app.jobs import JobStatus, JobStore, job_store
from app.writers.fhir import NoOpFhirPublisher, build_provider_fhir_bundle


class TestJobStore:
    def test_create_get_update(self):
        store = JobStore()
        job = store.create(filename="a.xlsx", source="csv_ingest")
        assert job.status == JobStatus.accepted
        assert store.get(job.job_id) is job

        updated = store.update(job.job_id, status=JobStatus.completed, providers_upserted=3)
        assert updated is not None
        assert updated.status == JobStatus.completed
        assert updated.providers_upserted == 3
        assert updated.to_dict()["status"] == "completed"

        assert store.update("missing", status=JobStatus.failed) is None

    def test_module_job_store_is_usable(self):
        job = job_store.create(filename="b.xlsx", source="test")
        assert job_store.get(job.job_id) is not None


class TestFhirBundle:
    def test_builds_org_location_and_service_entries(self):
        provider = ProviderCanonical(
            id="org-1",
            external_id="org-1",
            name="Lagos General",
            type="hospital",
            address="12 Marina",
            phone="+234",
            email="a@b.c",
            latitude=6.45,
            longitude=3.39,
            attributes={
                "fhir_location_id": "loc-1",
                "fhir_location_name": "Main",
                "fhir_healthcare_service_id": "hs-1",
                "fhir_healthcare_service_name": "ER",
                "fhir_service_category": "27",
                "specialty": "trauma",
                "appointmentRequired": True,
                "tier": "a",
            },
        )
        bundle = build_provider_fhir_bundle([provider])
        assert bundle["resourceType"] == "Bundle"
        assert len(bundle["entry"]) == 3
        types = [e["resource"]["resourceType"] for e in bundle["entry"]]
        assert types == ["Organization", "Location", "HealthcareService"]
        org = bundle["entry"][0]["resource"]
        assert org["type"][0]["coding"][0]["code"] == "hospital"
        assert org["extension"][0]["valueString"]
        assert "fhir_location_id" not in org["extension"][0]["valueString"]
        location = bundle["entry"][1]["resource"]
        assert location["position"]["latitude"] == 6.45
        service = bundle["entry"][2]["resource"]
        assert service["appointmentRequired"] is True
        assert service["specialty"][0]["text"] == "trauma"

    def test_defaults_service_category_and_noop_publisher(self):
        provider = ProviderCanonical(
            id="org-2",
            external_id="org-2",
            name="City Pharmacy",
            type="pharmacy",
            active=False,
        )
        bundle = build_provider_fhir_bundle([provider])
        service = bundle["entry"][2]["resource"]
        assert service["category"][0]["coding"][0]["code"] == "19"
        assert bundle["entry"][1]["resource"]["status"] == "inactive"
        NoOpFhirPublisher().publish([provider])
