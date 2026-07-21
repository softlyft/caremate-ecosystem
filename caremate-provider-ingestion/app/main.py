from __future__ import annotations

import logging
from typing import Annotated, Literal

from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.auth import require_api_key
from app.jobs import job_store
from app.pipeline import ResourceKind, run_resource_ingest_job
from app.settings import Settings, get_settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="CareMate Provider Ingestion",
    version="0.2.0",
    description=(
        "FHIR-shaped Excel ingest: Organization → Location → HealthcareService. "
        "Writes resource tables and rebuilds the Nearby providers projection."
    ),
)


@app.get("/health")
def health() -> dict:
    settings = get_settings()
    return {
        "status": "ok",
        "supabase_configured": bool(settings.supabase_url and settings.supabase_service_role_key),
    }


def _schedule_ingest(
    *,
    background_tasks: BackgroundTasks,
    file: UploadFile,
    resource: ResourceKind,
    source: str,
    settings: Settings,
):
    filename = file.filename or "upload.xlsx"
    if not filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File must be .xlsx")

    return filename, resource, source, settings


@app.post("/v1/ingest/organization", dependencies=[Depends(require_api_key)])
async def ingest_organization(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    source: Annotated[str, Form()] = "csv_ingest",
    settings: Settings = Depends(get_settings),
):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    filename = file.filename or "ng_provider_organization.xlsx"
    if not filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File must be .xlsx")

    job = job_store.create(filename=filename, source=source)
    background_tasks.add_task(
        run_resource_ingest_job,
        job_id=job.job_id,
        content=content,
        filename=filename,
        resource="organization",
        source=source,
        settings=settings,
    )
    return JSONResponse(status_code=202, content={"job_id": job.job_id, "status": "accepted", "resource": "organization"})


@app.post("/v1/ingest/location", dependencies=[Depends(require_api_key)])
async def ingest_location(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    source: Annotated[str, Form()] = "csv_ingest",
    settings: Settings = Depends(get_settings),
):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    filename = file.filename or "ng_provider_location.xlsx"
    if not filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File must be .xlsx")

    job = job_store.create(filename=filename, source=source)
    background_tasks.add_task(
        run_resource_ingest_job,
        job_id=job.job_id,
        content=content,
        filename=filename,
        resource="location",
        source=source,
        settings=settings,
    )
    return JSONResponse(status_code=202, content={"job_id": job.job_id, "status": "accepted", "resource": "location"})


@app.post("/v1/ingest/healthcareservice", dependencies=[Depends(require_api_key)])
async def ingest_healthcare_service(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    source: Annotated[str, Form()] = "csv_ingest",
    settings: Settings = Depends(get_settings),
):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    filename = file.filename or "ng_provider_healthcareservice.xlsx"
    if not filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File must be .xlsx")

    job = job_store.create(filename=filename, source=source)
    background_tasks.add_task(
        run_resource_ingest_job,
        job_id=job.job_id,
        content=content,
        filename=filename,
        resource="healthcareservice",
        source=source,
        settings=settings,
    )
    return JSONResponse(
        status_code=202,
        content={"job_id": job.job_id, "status": "accepted", "resource": "healthcareservice"},
    )


@app.get("/v1/jobs/{job_id}", dependencies=[Depends(require_api_key)])
def get_job(job_id: str):
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job.to_dict()


def run() -> None:
    import uvicorn

    settings = get_settings()
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)


if __name__ == "__main__":
    run()
