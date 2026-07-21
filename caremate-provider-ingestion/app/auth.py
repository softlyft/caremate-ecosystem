from __future__ import annotations

from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.settings import Settings, get_settings

bearer = HTTPBearer(auto_error=False)


def require_api_key(
    credentials: HTTPAuthorizationCredentials | None = Security(bearer),
    settings: Settings = Depends(get_settings),
) -> None:
    token = credentials.credentials if credentials else None
    if not token or token != settings.ingest_api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
