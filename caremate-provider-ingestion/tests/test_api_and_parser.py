from __future__ import annotations

import io

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.parsers.resource_xlsx import iter_resource_xlsx_rows
from app.settings import get_settings


@pytest.fixture(autouse=True)
def _clear_settings_cache():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setenv("INGEST_API_KEY", "test-key")
    get_settings.cache_clear()
    return TestClient(app)


def _xlsx_bytes() -> bytes:
    frame = pd.DataFrame(
        [
            {"name": "Lagos General", "active": True},
            {"name": None, "active": None},
        ]
    )
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        frame.to_excel(writer, sheet_name="Organizations", index=False)
    return buffer.getvalue()


class TestResourceXlsxParser:
    def test_reads_non_empty_rows_and_skips_blank(self):
        rows = iter_resource_xlsx_rows(_xlsx_bytes())
        assert len(rows) == 1
        assert rows[0]["name"] == "Lagos General"
        assert rows[0]["_sheet"] == "Organizations"
        assert rows[0]["_row"] == 2


class TestApi:
    def test_health(self, client: TestClient):
        response = client.get("/health")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "ok"
        assert "supabase_configured" in body

    def test_requires_api_key(self, client: TestClient):
        response = client.post(
            "/v1/ingest/organization",
            files={"file": ("org.xlsx", _xlsx_bytes(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )
        assert response.status_code == 401

    def test_rejects_non_xlsx(self, client: TestClient):
        response = client.post(
            "/v1/ingest/organization",
            headers={"Authorization": "Bearer test-key"},
            files={"file": ("org.csv", b"a,b\n1,2\n", "text/csv")},
        )
        assert response.status_code == 400
        assert "xlsx" in response.json()["detail"].lower()

    def test_rejects_empty_file(self, client: TestClient):
        response = client.post(
            "/v1/ingest/organization",
            headers={"Authorization": "Bearer test-key"},
            files={"file": ("org.xlsx", b"", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )
        assert response.status_code == 400

    def test_accepts_organization_ingest_and_fetches_job(self, client: TestClient, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr("app.main.run_resource_ingest_job", lambda **kwargs: None)

        response = client.post(
            "/v1/ingest/organization",
            headers={"Authorization": "Bearer test-key"},
            data={"source": "unit-test"},
            files={
                "file": (
                    "org.xlsx",
                    _xlsx_bytes(),
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            },
        )
        assert response.status_code == 202
        body = response.json()
        assert body["status"] == "accepted"
        assert body["resource"] == "organization"
        job_id = body["job_id"]

        job = client.get(f"/v1/jobs/{job_id}", headers={"Authorization": "Bearer test-key"})
        assert job.status_code == 200
        assert job.json()["job_id"] == job_id

        missing = client.get("/v1/jobs/missing", headers={"Authorization": "Bearer test-key"})
        assert missing.status_code == 404

    def test_location_and_healthcare_endpoints_accept(self, client: TestClient, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setattr("app.main.run_resource_ingest_job", lambda **kwargs: None)
        for path, resource in [
            ("/v1/ingest/location", "location"),
            ("/v1/ingest/healthcareservice", "healthcareservice"),
        ]:
            response = client.post(
                path,
                headers={"Authorization": "Bearer test-key"},
                files={
                    "file": (
                        f"{resource}.xlsx",
                        _xlsx_bytes(),
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    )
                },
            )
            assert response.status_code == 202
            assert response.json()["resource"] == resource

    def test_chain_endpoint_accepts_and_defaults_env_dev(
        self, client: TestClient, monkeypatch: pytest.MonkeyPatch
    ):
        captured: dict = {}

        def _capture(**kwargs):
            captured.update(kwargs)

        monkeypatch.setattr("app.main.run_chain_ingest_job", _capture)
        response = client.post(
            "/v1/ingest/chain",
            headers={"Authorization": "Bearer test-key"},
            data={"source": "unit-test"},
            files={
                "organization": (
                    "org.xlsx",
                    _xlsx_bytes(),
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            },
        )
        assert response.status_code == 202
        body = response.json()
        assert body["resource"] == "chain"
        assert body["env"] == "dev"
        assert captured["env"] == "dev"
        assert captured["organization_filename"] == "org.xlsx"

    def test_chain_endpoint_accepts_prod_via_query(
        self, client: TestClient, monkeypatch: pytest.MonkeyPatch
    ):
        monkeypatch.setattr("app.main.run_chain_ingest_job", lambda **kwargs: None)
        response = client.post(
            "/v1/ingest/chain?env=prod",
            headers={"Authorization": "Bearer test-key"},
            files={
                "organization": (
                    "org.xlsx",
                    _xlsx_bytes(),
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            },
        )
        assert response.status_code == 202
        assert response.json()["env"] == "prod"

    def test_chain_rejects_bad_env(self, client: TestClient):
        response = client.post(
            "/v1/ingest/chain?env=staging",
            headers={"Authorization": "Bearer test-key"},
            files={
                "organization": (
                    "org.xlsx",
                    _xlsx_bytes(),
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            },
        )
        assert response.status_code == 400
