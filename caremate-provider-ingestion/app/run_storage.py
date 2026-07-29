from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

IngestEnv = Literal["dev", "prod"]


@dataclass(frozen=True)
class RunPaths:
    env: IngestEnv
    run_id: str
    root: Path

    @property
    def originals(self) -> Path:
        return self.root / "originals"

    @property
    def cleaned(self) -> Path:
        return self.root / "cleaned"

    @property
    def manifest_path(self) -> Path:
        return self.root / "manifest.json"


def create_run_dir(base_dir: str | Path, env: IngestEnv, *, run_id: str | None = None) -> RunPaths:
    stamp = run_id or datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    root = Path(base_dir) / env / stamp
    paths = RunPaths(env=env, run_id=stamp, root=root)
    paths.originals.mkdir(parents=True, exist_ok=True)
    paths.cleaned.mkdir(parents=True, exist_ok=True)
    return paths


def save_bytes(path: Path, content: bytes) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return path


def write_manifest(paths: RunPaths, payload: dict[str, Any]) -> Path:
    body = {
        "env": paths.env,
        "run_id": paths.run_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        **payload,
    }
    paths.manifest_path.write_text(json.dumps(body, indent=2, default=str), encoding="utf-8")
    return paths.manifest_path
