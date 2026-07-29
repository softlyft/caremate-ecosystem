from __future__ import annotations

import logging
from pathlib import Path
from typing import Iterable

import httpx

from app.settings import Settings

logger = logging.getLogger(__name__)

SAMPLE_ORGANIZATION = "ng_provider_organization.xlsx"
SAMPLE_LOCATION = "ng_provider_location.xlsx"
SAMPLE_HEALTHCARESERVICE = "ng_provider_healthcareservice.xlsx"

CANONICAL_SAMPLE_FILES: tuple[str, ...] = (
    SAMPLE_ORGANIZATION,
    SAMPLE_LOCATION,
    SAMPLE_HEALTHCARESERVICE,
)


class SamplesMissingError(RuntimeError):
    """Raised when required sample workbooks are not local and not in Storage."""


def samples_dir(settings: Settings) -> Path:
    return Path(settings.samples_dir)


def storage_object_path(settings: Settings, filename: str) -> str:
    prefix = (settings.storage_samples_prefix or "samples").strip().strip("/")
    return f"{prefix}/{filename}" if prefix else filename


def missing_sample_files(directory: Path, filenames: Iterable[str] = CANONICAL_SAMPLE_FILES) -> list[str]:
    return [name for name in filenames if not (directory / name).is_file() or (directory / name).stat().st_size == 0]


def _storage_creds(settings: Settings) -> tuple[str, str]:
    url = (settings.storage_supabase_url or settings.supabase_url or settings.supabase_url_dev).strip().rstrip(
        "/"
    )
    key = (
        settings.storage_supabase_service_role_key
        or settings.supabase_service_role_key
        or settings.supabase_service_role_key_dev
    ).strip()
    return url, key


def download_sample_from_storage(settings: Settings, filename: str, dest: Path) -> None:
    url, key = _storage_creds(settings)
    if not url or not key:
        raise SamplesMissingError(
            "Cannot download samples: configure STORAGE_SUPABASE_URL / "
            "STORAGE_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)."
        )
    bucket = settings.storage_bucket.strip() or "provider-ingest"
    object_path = storage_object_path(settings, filename)
    endpoint = f"{url}/storage/v1/object/{bucket}/{object_path}"
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    with httpx.Client(timeout=180.0) as client:
        response = client.get(endpoint, headers=headers)
    if response.status_code == 404:
        raise SamplesMissingError(
            f"Sample workbook missing in Storage: {bucket}/{object_path}. "
            "Upload the canonical cleaned catalog first "
            "(scripts/upload_samples_to_storage.py)."
        )
    if response.status_code >= 400:
        raise SamplesMissingError(
            f"Failed to download {bucket}/{object_path}: "
            f"{response.status_code} {response.text[:300]}"
        )
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(response.content)
    logger.info("Downloaded sample %s (%s bytes)", dest.name, len(response.content))


def upload_sample_to_storage(settings: Settings, local_path: Path, filename: str | None = None) -> str:
    url, key = _storage_creds(settings)
    if not url or not key:
        raise SamplesMissingError("Storage credentials not configured for upload.")
    name = filename or local_path.name
    bucket = settings.storage_bucket.strip() or "provider-ingest"
    object_path = storage_object_path(settings, name)
    endpoint = f"{url}/storage/v1/object/{bucket}/{object_path}"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "x-upsert": "true",
    }
    with httpx.Client(timeout=180.0) as client:
        response = client.post(endpoint, headers=headers, content=local_path.read_bytes())
    if response.status_code >= 400:
        raise RuntimeError(
            f"Upload failed for {bucket}/{object_path}: {response.status_code} {response.text[:300]}"
        )
    logger.info("Uploaded sample %s → %s/%s", local_path, bucket, object_path)
    return f"{bucket}/{object_path}"


def ensure_local_samples(
    settings: Settings,
    *,
    filenames: Iterable[str] = CANONICAL_SAMPLE_FILES,
    force_download: bool = False,
) -> Path:
    """
    Ensure sample xlsx files exist under samples_dir.
    Downloads missing (or all, if force_download) objects from shared Storage.
    """
    directory = samples_dir(settings)
    directory.mkdir(parents=True, exist_ok=True)
    wanted = list(filenames)
    to_fetch = wanted if force_download else missing_sample_files(directory, wanted)
    errors: list[str] = []
    for name in to_fetch:
        try:
            download_sample_from_storage(settings, name, directory / name)
        except SamplesMissingError as exc:
            errors.append(str(exc))
    still_missing = missing_sample_files(directory, wanted)
    if still_missing:
        joined = ", ".join(still_missing)
        hint = "; ".join(errors) if errors else "pull from Storage failed or was skipped"
        raise SamplesMissingError(
            f"Required sample workbook(s) missing under {directory}: {joined}. {hint}"
        )
    return directory


def publish_local_samples_to_storage(
    settings: Settings,
    *,
    filenames: Iterable[str] = CANONICAL_SAMPLE_FILES,
) -> list[str]:
    directory = samples_dir(settings)
    missing = missing_sample_files(directory, filenames)
    if missing:
        raise SamplesMissingError(
            f"Cannot publish — local samples missing: {', '.join(missing)} under {directory}"
        )
    return [upload_sample_to_storage(settings, directory / name, name) for name in filenames]


def copy_cleaned_to_samples(
    settings: Settings,
    *,
    organization: Path,
    location: Path | None = None,
    healthcareservice: Path | None = None,
) -> None:
    """Promote a run's cleaned workbooks to the local samples source of truth."""
    directory = samples_dir(settings)
    directory.mkdir(parents=True, exist_ok=True)
    (directory / SAMPLE_ORGANIZATION).write_bytes(organization.read_bytes())
    if location and location.is_file():
        (directory / SAMPLE_LOCATION).write_bytes(location.read_bytes())
    if healthcareservice and healthcareservice.is_file():
        (directory / SAMPLE_HEALTHCARESERVICE).write_bytes(healthcareservice.read_bytes())
