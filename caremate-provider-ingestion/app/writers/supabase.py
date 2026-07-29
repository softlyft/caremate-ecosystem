from __future__ import annotations

import logging
import math
from typing import Any

import httpx

from app.settings import Settings

logger = logging.getLogger(__name__)


def _json_safe(value: Any) -> Any:
    # numpy / pandas scalars → Python
    if value is not None and hasattr(value, "item") and callable(value.item) and not isinstance(
        value, (bytes, str, dict, list)
    ):
        try:
            value = value.item()
        except Exception:  # noqa: BLE001
            pass
    try:
        import pandas as pd

        if value is pd.NA or (isinstance(value, float) and pd.isna(value)):
            return None
    except Exception:  # noqa: BLE001
        pass
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    return value


class SupabaseWriter:
    def __init__(self, settings: Settings):
        self._url = settings.supabase_url.rstrip("/")
        self._key = settings.supabase_service_role_key

    def enabled(self) -> bool:
        return bool(self._url and self._key)

    def _headers(self, *, prefer: str = "resolution=merge-duplicates,return=minimal") -> dict[str, str]:
        return {
            "apikey": self._key,
            "Authorization": f"Bearer {self._key}",
            "Content-Type": "application/json",
            "Prefer": prefer,
        }

    def _require(self) -> None:
        if not self.enabled():
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")

    def upsert(self, table: str, rows: list[dict[str, Any]], *, on_conflict: str = "id") -> int:
        self._require()
        if not rows:
            return 0
        written = 0
        chunk_size = 200
        with httpx.Client(timeout=180.0) as client:
            for i in range(0, len(rows), chunk_size):
                chunk = [_json_safe(row) for row in rows[i : i + chunk_size]]
                response = client.post(
                    f"{self._url}/rest/v1/{table}?on_conflict={on_conflict}",
                    headers=self._headers(),
                    json=chunk,
                )
                if response.status_code >= 400:
                    logger.error("%s upsert failed: %s %s", table, response.status_code, response.text)
                    raise RuntimeError(f"{table} upsert failed: {response.status_code} {response.text}")
                written += len(chunk)
                if i == 0 or (i // chunk_size) % 25 == 0:
                    logger.info("%s upsert progress: %s/%s", table, written, len(rows))
        return written

    def select(
        self,
        table: str,
        *,
        params: dict[str, str],
    ) -> list[dict[str, Any]]:
        self._require()
        with httpx.Client(timeout=60.0) as client:
            response = client.get(
                f"{self._url}/rest/v1/{table}",
                headers={**self._headers(prefer="return=representation"), "Accept": "application/json"},
                params=params,
            )
            if response.status_code >= 400:
                raise RuntimeError(f"{table} select failed: {response.status_code} {response.text}")
            data = response.json()
            return data if isinstance(data, list) else []

    def get_by_id(self, table: str, row_id: str) -> dict[str, Any] | None:
        rows = self.select(table, params={"id": f"eq.{row_id}", "select": "*", "limit": "1"})
        return rows[0] if rows else None

    def count_rows(self, table: str, *, active_only: bool = True) -> int:
        """Exact row count via Prefer: count=exact (Content-Range)."""
        self._require()
        params: dict[str, str] = {"select": "id", "limit": "1"}
        if active_only:
            params["deleted_at"] = "is.null"
        with httpx.Client(timeout=60.0) as client:
            response = client.get(
                f"{self._url}/rest/v1/{table}",
                headers={
                    **self._headers(prefer="count=exact"),
                    "Accept": "application/json",
                },
                params=params,
            )
            if response.status_code >= 400:
                raise RuntimeError(f"{table} count failed: {response.status_code} {response.text}")
            # content-range: 0-0/42928 or */0
            cr = response.headers.get("content-range") or ""
            if "/" in cr:
                total = cr.rsplit("/", 1)[-1]
                if total.isdigit():
                    return int(total)
            data = response.json()
            return len(data) if isinstance(data, list) else 0

    def catalog_is_empty(self) -> bool:
        """True when this env has no active organizations (new-env bootstrap)."""
        return self.count_rows("provider_organizations", active_only=True) == 0

    def list_organization_name_ids(self) -> dict[str, str]:
        """Map casefolded trimmed name → organization UUID for all rows."""
        mapping: dict[str, str] = {}
        offset = 0
        page_size = 1000
        while True:
            rows = self.select(
                "provider_organizations",
                params={
                    "select": "id,name",
                    "order": "created_at.asc",
                    "limit": str(page_size),
                    "offset": str(offset),
                },
            )
            if not rows:
                break
            for row in rows:
                name = str(row.get("name") or "").strip().casefold()
                if name and name not in mapping:
                    mapping[name] = str(row["id"])
            if len(rows) < page_size:
                break
            offset += page_size
        return mapping

        """Case-insensitive name match; prefer active row, else soft-deleted."""
        trimmed = name.strip()
        if not trimmed:
            return None
        # PostgREST ilike is case-insensitive; escape wildcards for exact match
        escaped = trimmed.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        rows = self.select(
            "provider_organizations",
            params={
                "name": f"ilike.{escaped}",
                "select": "*",
                "order": "deleted_at.nullsfirst,created_at.asc",
                "limit": "5",
            },
        )
        target = trimmed.casefold()
        matches = [r for r in rows if str(r.get("name") or "").strip().casefold() == target]
        if not matches:
            return None
        active = [r for r in matches if not r.get("deleted_at")]
        return active[0] if active else matches[0]

    def insert_returning(self, table: str, row: dict[str, Any]) -> dict[str, Any]:
        """INSERT one row; omit id so Postgres gen_random_uuid() applies."""
        self._require()
        payload = _json_safe({k: v for k, v in row.items() if k != "id"})
        with httpx.Client(timeout=60.0) as client:
            response = client.post(
                f"{self._url}/rest/v1/{table}",
                headers=self._headers(prefer="return=representation"),
                json=payload,
            )
            if response.status_code >= 400:
                logger.error("%s insert failed: %s %s", table, response.status_code, response.text)
                raise RuntimeError(f"{table} insert failed: {response.status_code} {response.text}")
            data = response.json()
            if isinstance(data, list) and data:
                return data[0]
            if isinstance(data, dict):
                return data
            raise RuntimeError(f"{table} insert returned no representation")

    def update_by_id(self, table: str, row_id: str, row: dict[str, Any]) -> dict[str, Any]:
        self._require()
        payload = _json_safe({k: v for k, v in row.items() if k != "id"})
        with httpx.Client(timeout=60.0) as client:
            response = client.patch(
                f"{self._url}/rest/v1/{table}?id=eq.{row_id}",
                headers=self._headers(prefer="return=representation"),
                json=payload,
            )
            if response.status_code >= 400:
                logger.error("%s update failed: %s %s", table, response.status_code, response.text)
                raise RuntimeError(f"{table} update failed: {response.status_code} {response.text}")
            data = response.json()
            if isinstance(data, list) and data:
                return data[0]
            if isinstance(data, dict) and data:
                return data
            raise RuntimeError(f"{table} update matched no row for id={row_id}")

    def insert_or_update(
        self,
        table: str,
        row: dict[str, Any],
        *,
        label: str = "record",
        unique_name: bool = False,
    ) -> tuple[dict[str, Any], str]:
        """
        If row['id'] is a UUID → validate it exists, then UPDATE.
        Else if unique_name and name matches an existing row → UPDATE that row.
        Otherwise → INSERT (Postgres assigns gen_random_uuid()).
        Returns (saved_row, 'inserted'|'updated').
        """
        row_id = row.get("id")
        if row_id:
            existing = self.get_by_id(table, str(row_id))
            if not existing:
                raise ValueError(f"{label} UUID {row_id} not found — cannot update")
            saved = self._save_with_resource_id(table, str(row_id), row)
            return saved, "updated"

        if unique_name and table == "provider_organizations":
            name = str(row.get("name") or "").strip()
            if name:
                existing = self.find_organization_by_name(name)
                if existing:
                    payload = {**row, "deleted_at": None, "active": row.get("active", True)}
                    saved = self._save_with_resource_id(table, str(existing["id"]), payload)
                    return saved, "updated"

        saved = self.insert_returning(table, row)
        saved = self._ensure_resource_id(table, saved, row.get("updated_at"))
        return saved, "inserted"

    def _save_with_resource_id(self, table: str, row_id: str, row: dict[str, Any]) -> dict[str, Any]:
        saved = self.update_by_id(table, row_id, row)
        return self._ensure_resource_id(table, saved, row.get("updated_at"), base_row=row)

    def _ensure_resource_id(
        self,
        table: str,
        saved: dict[str, Any],
        updated_at: Any = None,
        *,
        base_row: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        resource = saved.get("resource")
        if isinstance(resource, dict) and resource.get("id") != saved["id"]:
            resource = {**resource, "id": saved["id"]}
            patch: dict[str, Any] = {"resource": resource}
            if updated_at is not None:
                patch["updated_at"] = updated_at
            if base_row:
                # Keep other fields from the write when syncing resource.id
                for key in ("name", "active", "source", "last_ingested_at", "deleted_at"):
                    if key in base_row:
                        patch[key] = base_row[key]
            saved = self.update_by_id(table, str(saved["id"]), patch)
        return saved

    def soft_delete_providers_by_ids(self, ids: list[str]) -> None:
        if not ids:
            return
        self._require()
        from datetime import datetime, timezone

        now = datetime.now(timezone.utc).isoformat()
        with httpx.Client(timeout=60.0) as client:
            # PostgREST in filter — chunk
            for i in range(0, len(ids), 50):
                chunk = ids[i : i + 50]
                quoted = ",".join(f'"{i}"' for i in chunk)
                response = client.patch(
                    f"{self._url}/rest/v1/providers?id=in.({quoted})",
                    headers=self._headers(prefer="return=minimal"),
                    json={"deleted_at": now, "active": False, "updated_at": now},
                )
                if response.status_code >= 400:
                    logger.warning("soft-delete providers failed: %s", response.text)
