from __future__ import annotations

import io
from pathlib import Path
from typing import Any
from uuid import uuid4

import pandas as pd
import pytest

from app.jobs import JobStatus, job_store
from app.orchestrate import run_chain_ingest_job
from app.settings import Settings


def _xlsx(rows: list[dict[str, Any]], sheet: str = "A") -> bytes:
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        pd.DataFrame(rows).to_excel(writer, sheet_name=sheet, index=False)
    return buffer.getvalue()


class _FakeWriter:
    def __init__(self) -> None:
        self.tables: dict[str, dict[str, dict[str, Any]]] = {
            "provider_organizations": {},
            "provider_locations": {},
            "provider_healthcare_services": {},
            "providers": {},
        }

    def upsert(self, table: str, rows: list[dict[str, Any]], *, on_conflict: str = "id") -> int:
        for row in rows:
            row_id = str(row["id"])
            self.tables[table][row_id] = {**row}
        return len(rows)

    def soft_delete_providers_by_ids(self, ids: list[str]) -> None:
        return None

    def list_organization_name_ids(self) -> dict[str, str]:
        return {}

    def catalog_is_empty(self) -> bool:
        return len(self.tables["provider_organizations"]) == 0

    def count_rows(self, table: str, *, active_only: bool = True) -> int:
        return len(self.tables.get(table, {}))

    def insert_or_update(
        self,
        table: str,
        payload: dict[str, Any],
        *,
        label: str = "",
        unique_name: bool = False,
    ) -> tuple[dict[str, Any], str]:
        row_id = payload.get("id")
        if row_id and str(row_id) in self.tables[table]:
            saved = {**self.tables[table][str(row_id)], **payload, "id": str(row_id)}
            self.tables[table][str(row_id)] = saved
            return saved, "updated"
        new_id = str(row_id) if row_id else str(uuid4())
        saved = {**payload, "id": new_id}
        self.tables[table][new_id] = saved
        return saved, "inserted"

    def get_by_id(self, table: str, row_id: str) -> dict[str, Any] | None:
        return self.tables[table].get(str(row_id))


def test_chain_resolves_slug_and_writes_cleaned(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    org_xlsx = _xlsx(
        [
            {
                "id": "org-beachland",
                "name": "Beachland Specialist Hospital",
                "active": True,
                "identifier": '[{"code":"org-beachland"}]',
            }
        ],
        sheet="B",
    )
    loc_xlsx = _xlsx(
        [
            {
                "id": "loc-main",
                "name": "Beachland Main Campus",
                "status": "active",
                "managingOrganization": "beachland-specialist-hospital",
                "latitude": 6.45,
                "longitude": 3.39,
            }
        ],
        sheet="B",
    )
    hs_xlsx = _xlsx(
        [
            {
                "id": "hs-gp",
                "name": "General Practice",
                "active": True,
                "location": "beachland-main-campus",
            }
        ],
        sheet="B",
    )

    fake = _FakeWriter()
    monkeypatch.setattr("app.orchestrate.SupabaseWriter", lambda settings: fake)
    monkeypatch.setattr("app.orchestrate.publish_local_samples_to_storage", lambda settings: [])
    monkeypatch.setattr("app.orchestrate.copy_cleaned_to_samples", lambda *a, **k: None)

    settings = Settings(
        ingest_api_key="test",
        supabase_url_dev="https://example.supabase.co",
        supabase_service_role_key_dev="service-role",
        runs_dir=str(tmp_path / "runs"),
    )
    job = job_store.create(filename="chain", source="unit-test")

    run_chain_ingest_job(
        job_id=job.job_id,
        organization_content=org_xlsx,
        organization_filename="org.xlsx",
        location_content=loc_xlsx,
        location_filename="loc.xlsx",
        healthcareservice_content=hs_xlsx,
        healthcareservice_filename="hs.xlsx",
        source="unit-test",
        env="dev",
        settings=settings,
    )

    updated = job_store.get(job.job_id)
    assert updated is not None
    assert updated.status == JobStatus.completed
    details = updated.details or {}
    assert details["organization"]["inserted"] == 1
    assert details["location"]["inserted"] == 1
    assert details["healthcareservice"]["inserted"] == 1
    assert details["location"]["skipped"] == 0
    assert details["healthcareservice"]["skipped"] == 0
    assert details["projections_updated"] == 1

    org_uuid = details["organization"]["ids"][0]
    assert "providers" in fake.tables
    assert len(fake.tables["providers"]) == 1

    cleaned_org = Path(details["organization"]["cleaned_file"])
    assert cleaned_org.is_file()
    org_rows = pd.read_excel(cleaned_org, sheet_name="B").to_dict(orient="records")
    assert org_rows[0]["id"] == org_uuid

    cleaned_loc = Path(details["location"]["cleaned_file"])
    loc_rows = pd.read_excel(cleaned_loc, sheet_name="B").to_dict(orient="records")
    assert loc_rows[0]["id"] == details["location"]["ids"][0]
    assert org_uuid in str(loc_rows[0]["managingOrganization"])

    manifest = Path(details["files"]["manifest"])
    assert manifest.is_file()


def test_chain_fails_when_env_not_configured(tmp_path: Path):
    settings = Settings(
        ingest_api_key="test",
        supabase_url="",
        supabase_service_role_key="",
        supabase_url_dev="",
        supabase_service_role_key_dev="",
        runs_dir=str(tmp_path / "runs"),
    )
    job = job_store.create(filename="chain", source="unit-test")
    run_chain_ingest_job(
        job_id=job.job_id,
        organization_content=_xlsx([{"name": "X", "active": True}]),
        organization_filename="org.xlsx",
        env="dev",
        settings=settings,
    )
    updated = job_store.get(job.job_id)
    assert updated is not None
    assert updated.status == JobStatus.failed
    assert "not configured" in (updated.error or "").lower()
