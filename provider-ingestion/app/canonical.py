from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field


PROVIDER_TYPES = frozenset(
    {
        "hospital",
        "clinic",
        "pharmacy",
        "laboratory",
        "telemedicine",
        "blood_bank",
        "ambulance",
        "dentist",
        "mental_health",
    }
)


class ProviderCanonical(BaseModel):
    """Normalized provider row ready for Supabase / future FHIR publish."""

    id: str
    external_id: str
    name: str
    type: str
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    distance_km: float | None = None
    attributes: dict[str, Any] = Field(default_factory=dict)
    active: bool = True
    source: str = "csv_ingest"
    last_ingested_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def to_supabase_row(self) -> dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        return {
            "id": self.id,
            "external_id": self.external_id,
            "name": self.name,
            "type": self.type,
            "address": self.address,
            "phone": self.phone,
            "email": self.email,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "distance_km": self.distance_km,
            "attributes": self.attributes,
            "active": self.active,
            "source": self.source,
            "last_ingested_at": self.last_ingested_at,
            "deleted_at": None,
            "updated_at": now,
        }
