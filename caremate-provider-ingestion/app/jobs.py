from __future__ import annotations

import threading
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any


class JobStatus(str, Enum):
    accepted = "accepted"
    running = "running"
    completed = "completed"
    failed = "failed"


@dataclass
class IngestJob:
    job_id: str
    status: JobStatus
    filename: str
    source: str
    created_at: str
    updated_at: str
    providers_upserted: int = 0
    error: str | None = None
    details: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "job_id": self.job_id,
            "status": self.status.value,
            "filename": self.filename,
            "source": self.source,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "providers_upserted": self.providers_upserted,
            "error": self.error,
            "details": self.details,
        }


class JobStore:
    """In-memory job store (v1). Swap for Redis/DB without changing API shapes."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._jobs: dict[str, IngestJob] = {}

    def create(self, *, filename: str, source: str) -> IngestJob:
        now = datetime.now(timezone.utc).isoformat()
        job = IngestJob(
            job_id=str(uuid.uuid4()),
            status=JobStatus.accepted,
            filename=filename,
            source=source,
            created_at=now,
            updated_at=now,
        )
        with self._lock:
            self._jobs[job.job_id] = job
        return job

    def get(self, job_id: str) -> IngestJob | None:
        with self._lock:
            return self._jobs.get(job_id)

    def update(self, job_id: str, **kwargs: Any) -> IngestJob | None:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return None
            for key, value in kwargs.items():
                setattr(job, key, value)
            job.updated_at = datetime.now(timezone.utc).isoformat()
            return job


job_store = JobStore()
