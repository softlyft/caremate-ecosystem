from __future__ import annotations

import logging
from typing import Annotated

from fastapi import (
    BackgroundTasks,
    Depends,
    FastAPI,
    File,
    Form,
    Header,
    HTTPException,
    Query,
    UploadFile,
)
from fastapi.responses import JSONResponse

from app.auth import require_api_key
from app.jobs import job_store
from app.orchestrate import run_chain_ingest_job
from app.pipeline import run_resource_ingest_job
from app.run_storage import IngestEnv
from app.settings import Settings, get_settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="CareMate Provider Ingestion",
    version="0.3.0",
    description=(
        "FHIR-shaped Excel ingest: Organization → Location → HealthcareService. "
        "Use POST /v1/ingest/chain for automated UUID write-back. "
        "Writes resource tables and rebuilds the Nearby providers projection."
    ),
)


def resolve_ingest_env(
    env: Annotated[str | None, Query(description="dev | prod")] = None,
    x_ingest_env: Annotated[str | None, Header(alias="X-Ingest-Env")] = None,
) -> IngestEnv:
    raw = (env or x_ingest_env or "dev").strip().lower()
    if raw not in ("dev", "prod"):
        raise HTTPException(status_code=400, detail="env must be 'dev' or 'prod'")
    return raw  # type: ignore[return-value]


def _require_xlsx(filename: str) -> None:
    if not filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File must be .xlsx")


@app.get("/health")
def health() -> dict:
    settings = get_settings()
    return {
        "status": "ok",
        "supabase_configured": bool(settings.supabase_url and settings.supabase_service_role_key),
        "supabase_configured_dev": settings.configured_for("dev"),
        "supabase_configured_prod": settings.configured_for("prod"),
        "runs_dir": settings.runs_dir,
    }


@app.post("/v1/ingest/chain", dependencies=[Depends(require_api_key)])
async def ingest_chain(
    background_tasks: BackgroundTasks,
    organization: UploadFile = File(..., description="Organization workbook (required)"),
    location: UploadFile | None = File(None, description="Location workbook (optional)"),
    healthcareservice: UploadFile | None = File(
        None, description="HealthcareService workbook (optional)"
    ),
    source: Annotated[str, Form()] = "csv_ingest",
    ingest_env: IngestEnv = Depends(resolve_ingest_env),
    settings: Settings = Depends(get_settings),
):
    """
    Orchestrated Org → Location → HealthcareService ingest from uploaded workbooks.

    Prefer POST /v1/ingest/chain-from-samples for the shared Storage source of truth.
    """
    org_name = organization.filename or "organization.xlsx"
    _require_xlsx(org_name)
    org_bytes = await organization.read()
    if not org_bytes:
        raise HTTPException(status_code=400, detail="Organization file is empty")

    loc_name: str | None = None
    loc_bytes: bytes | None = None
    if location is not None and location.filename:
        loc_name = location.filename
        _require_xlsx(loc_name)
        loc_bytes = await location.read()
        if not loc_bytes:
            raise HTTPException(status_code=400, detail="Location file is empty")

    hs_name: str | None = None
    hs_bytes: bytes | None = None
    if healthcareservice is not None and healthcareservice.filename:
        hs_name = healthcareservice.filename
        _require_xlsx(hs_name)
        hs_bytes = await healthcareservice.read()
        if not hs_bytes:
            raise HTTPException(status_code=400, detail="HealthcareService file is empty")

    job = job_store.create(filename=org_name, source=source)
    background_tasks.add_task(
        run_chain_ingest_job,
        job_id=job.job_id,
        organization_content=org_bytes,
        organization_filename=org_name,
        location_content=loc_bytes,
        location_filename=loc_name,
        healthcareservice_content=hs_bytes,
        healthcareservice_filename=hs_name,
        source=source,
        env=ingest_env,
        settings=settings,
        publish_samples=False,
    )
    return JSONResponse(
        status_code=202,
        content={
            "job_id": job.job_id,
            "status": "accepted",
            "resource": "chain",
            "env": ingest_env,
        },
    )


@app.post("/v1/ingest/chain-from-samples", dependencies=[Depends(require_api_key)])
async def ingest_chain_from_samples(
    background_tasks: BackgroundTasks,
    ingest_env: IngestEnv = Depends(resolve_ingest_env),
    settings: Settings = Depends(get_settings),
    force_download: Annotated[
        bool, Query(description="Re-download samples from Storage even if local files exist")
    ] = True,
    publish_samples: Annotated[
        bool, Query(description="After success, promote cleaned workbooks to samples + Storage")
    ] = True,
):
    """
    Pull canonical workbooks from shared Storage into samples/, then chain-ingest.

    Empty target DB → catalog_mode=bootstrap (seed with cleaned UUIDs).
    Existing rows → catalog_mode=update.
    """
    from app.samples_sync import (
        SAMPLE_HEALTHCARESERVICE,
        SAMPLE_LOCATION,
        SAMPLE_ORGANIZATION,
        SamplesMissingError,
        ensure_local_samples,
        samples_dir,
    )

    try:
        directory = ensure_local_samples(settings, force_download=force_download)
    except SamplesMissingError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    org_path = directory / SAMPLE_ORGANIZATION
    loc_path = directory / SAMPLE_LOCATION
    hs_path = directory / SAMPLE_HEALTHCARESERVICE
    org_bytes = org_path.read_bytes()
    loc_bytes = loc_path.read_bytes() if loc_path.is_file() else None
    hs_bytes = hs_path.read_bytes() if hs_path.is_file() else None

    job = job_store.create(filename=SAMPLE_ORGANIZATION, source="samples")
    background_tasks.add_task(
        run_chain_ingest_job,
        job_id=job.job_id,
        organization_content=org_bytes,
        organization_filename=SAMPLE_ORGANIZATION,
        location_content=loc_bytes,
        location_filename=SAMPLE_LOCATION if loc_bytes else None,
        healthcareservice_content=hs_bytes,
        healthcareservice_filename=SAMPLE_HEALTHCARESERVICE if hs_bytes else None,
        source="samples",
        env=ingest_env,
        settings=settings,
        publish_samples=publish_samples,
    )
    return JSONResponse(
        status_code=202,
        content={
            "job_id": job.job_id,
            "status": "accepted",
            "resource": "chain-from-samples",
            "env": ingest_env,
            "samples_dir": str(samples_dir(settings)),
            "force_download": force_download,
            "publish_samples": publish_samples,
        },
    )


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
    _require_xlsx(filename)

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
    return JSONResponse(
        status_code=202,
        content={"job_id": job.job_id, "status": "accepted", "resource": "organization"},
    )


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
    _require_xlsx(filename)

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
    return JSONResponse(
        status_code=202, content={"job_id": job.job_id, "status": "accepted", "resource": "location"}
    )


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
    _require_xlsx(filename)

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
