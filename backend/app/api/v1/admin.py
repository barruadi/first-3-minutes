from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.admin import (
    AnalyticsSummaryResponse,
    ComplianceReportRequest,
    ComplianceReportResponse,
    ComplianceReportStatusResponse,
    FloorPlanListResponse,
    FloorPlanResponse,
    LocationCreateRequest,
    LocationResponse,
    QrProvisionResponse,
)
from app.services import admin as admin_service
from app.services import compliance as compliance_service
from app.services import qr as qr_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/analytics", response_model=AnalyticsSummaryResponse)
def get_analytics(
    building_id: str | None = Query(default=None, alias="buildingId"),
    db: Session = Depends(get_db),
):
    # buildingId is intentionally ignored; scope always comes from DEMO_BUILDING_ID.
    return admin_service.get_analytics(db)


@router.post("/floor-plans", response_model=FloorPlanResponse, status_code=201)
async def create_floor_plan(
    file: UploadFile = File(...),
    name: str | None = Form(default=None),
    db: Session = Depends(get_db),
):
    return await admin_service.create_floor_plan(db, file, name)


@router.get("/floor-plans", response_model=FloorPlanListResponse)
def list_floor_plans(db: Session = Depends(get_db)):
    return FloorPlanListResponse(items=admin_service.list_floor_plans(db))


@router.get("/floor-plans/{floor_plan_id}", response_model=FloorPlanResponse)
def get_floor_plan(floor_plan_id: str, db: Session = Depends(get_db)):
    return admin_service.get_floor_plan(db, floor_plan_id)


@router.get("/floor-plans/{floor_plan_id}/file")
def download_floor_plan(floor_plan_id: str, db: Session = Depends(get_db)):
    path, media_type = admin_service.floor_plan_file(db, floor_plan_id)
    return FileResponse(path, media_type=media_type, filename=path.name)


@router.post("/locations", response_model=LocationResponse, status_code=201)
def create_location(body: LocationCreateRequest, db: Session = Depends(get_db)):
    return admin_service.create_location(db, body)


@router.get("/locations", response_model=list[LocationResponse])
def list_locations(db: Session = Depends(get_db)):
    return admin_service.list_locations(db)


@router.post("/locations/{location_id}/rescue-qr", response_model=QrProvisionResponse, status_code=201)
def generate_rescue_qr(location_id: str, db: Session = Depends(get_db)):
    return qr_service.generate_qr(db, location_id)


@router.get("/qr/{qr_id}.{extension}")
def download_qr(qr_id: str, extension: str, db: Session = Depends(get_db)):
    path, media_type = qr_service.qr_file(db, qr_id, extension)
    return FileResponse(path, media_type=media_type, filename=path.name)


@router.post("/compliance-reports", response_model=ComplianceReportResponse, status_code=201)
def create_compliance_report(body: ComplianceReportRequest, db: Session = Depends(get_db)):
    return compliance_service.create_report(db, body)


@router.get("/compliance-reports/{report_id}", response_model=ComplianceReportStatusResponse)
def get_compliance_report(report_id: str, db: Session = Depends(get_db)):
    return compliance_service.get_report(db, report_id)


@router.get("/compliance-reports/{report_id}/download")
def download_compliance_report(report_id: str, db: Session = Depends(get_db)):
    path = compliance_service.report_file(db, report_id)
    return FileResponse(path, media_type="application/pdf", filename=f"3minutes-compliance-{report_id}.pdf")
