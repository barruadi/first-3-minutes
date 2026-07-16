from fastapi import APIRouter, UploadFile, File
from app.schemas.admin import (
    AnalyticsSummaryResponse, SafetyMatrixCell,
    LocationResponse, QrProvisionResponse,
    ComplianceReportRequest, ComplianceReportResponse,
)
from app.schemas.common import Coordinate3D
from app.core.config import settings
from datetime import datetime

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/analytics", response_model=AnalyticsSummaryResponse)
def get_analytics():
    # Demo fixture; Domain 3 implements real aggregation
    return AnalyticsSummaryResponse(
        building_id=settings.demo_building_id,
        participation_rate_percentage=85.0,
        average_shelter_time_ms=12100,
        escape_route_trends=[{"period": "2026-W29", "averageEvacuationTimeMs": 64000}],
        heatmap_cells=[
            SafetyMatrixCell(
                location_ref="floor-4-room-402",
                failure_rate_percentage=15.0,
                average_evacuation_time_ms=73200,
                sample_count=20,
            )
        ],
    )


@router.post("/floor-plans")
def create_floor_plan(file: UploadFile = File(...)):
    return {"message": "NOT_IMPLEMENTED", "placeholder": True}


@router.get("/floor-plans")
def list_floor_plans():
    return {"items": [], "message": "NOT_IMPLEMENTED"}


@router.get("/floor-plans/{floor_plan_id}")
def get_floor_plan(floor_plan_id: str):
    return {"id": floor_plan_id, "message": "NOT_IMPLEMENTED"}


@router.post("/locations")
def create_location(body: dict):
    return {"message": "NOT_IMPLEMENTED", "placeholder": True}


@router.get("/locations", response_model=list[LocationResponse])
def list_locations():
    # Demo fixture
    return [
        LocationResponse(
            id="loc-demo-001",
            building_id=settings.demo_building_id,
            floor_plan_id="floorplan-demo-001",
            location_ref="floor-4-room-402",
            label="Lantai 4 Ruang 402",
            origin=Coordinate3D(x=0, y=0, z=0),
            route_points=[Coordinate3D(x=0, y=0, z=-1.5), Coordinate3D(x=1.2, y=0, z=-3.0)],
            exit_point=Coordinate3D(x=2.1, y=0, z=-5.0),
            created_at=datetime(2026, 7, 16),
        )
    ]


@router.post("/locations/{location_id}/rescue-qr", response_model=QrProvisionResponse)
def generate_rescue_qr(location_id: str):
    # Placeholder: Domain 3 implements real QR cryptography
    base_url = "https://guest.example"
    token = f"demo-token-{location_id}"
    return QrProvisionResponse(
        location_id=location_id,
        guest_url=f"{base_url}/rescue/{token}",
        qr_svg_url=f"/api/admin/qr/{token}.svg",
        qr_png_url=f"/api/admin/qr/{token}.png",
    )


@router.post("/compliance-reports", response_model=ComplianceReportResponse)
def create_compliance_report(body: ComplianceReportRequest):
    # Placeholder: Domain 3 implements PDF generation
    return ComplianceReportResponse(report_id="report-demo-001", status="pending")


@router.get("/compliance-reports/{report_id}")
def get_compliance_report(report_id: str):
    return {"reportId": report_id, "status": "pending", "message": "NOT_IMPLEMENTED"}


@router.get("/compliance-reports/{report_id}/download")
def download_compliance_report(report_id: str):
    from fastapi.responses import JSONResponse
    return JSONResponse({"error": {"code": "NOT_IMPLEMENTED", "message": "PDF generation not yet implemented", "details": None}}, status_code=501)
