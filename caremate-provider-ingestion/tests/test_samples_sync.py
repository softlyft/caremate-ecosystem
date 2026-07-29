from __future__ import annotations

from pathlib import Path

import pytest

from app.samples_sync import SamplesMissingError, ensure_local_samples, missing_sample_files
from app.settings import Settings


def test_missing_sample_files(tmp_path: Path):
    assert missing_sample_files(tmp_path) == [
        "ng_provider_organization.xlsx",
        "ng_provider_location.xlsx",
        "ng_provider_healthcareservice.xlsx",
    ]
    (tmp_path / "ng_provider_organization.xlsx").write_bytes(b"abc")
    assert "ng_provider_organization.xlsx" not in missing_sample_files(tmp_path)


def test_ensure_local_samples_errors_clearly_when_missing(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    settings = Settings(
        samples_dir=str(tmp_path),
        supabase_url="",
        supabase_service_role_key="",
        storage_supabase_url="",
        storage_supabase_service_role_key="",
    )
    with pytest.raises(SamplesMissingError) as exc:
        ensure_local_samples(settings, force_download=False)
    assert "missing" in str(exc.value).lower()
