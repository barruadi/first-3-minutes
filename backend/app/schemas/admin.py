from datetime import datetime
from app.schemas.common import CamelModel, Coordinate3D


class SafetyMatrixCell(CamelModel):
    location_ref: str
    failure_rate_percentage: float
    average_evacuation_time_ms: int
    sample_count: int


class AnalyticsSummaryResponse(CamelModel):
    building_id: str
    participation_rate_percentage: float
    average_shelter_time_ms: int
    escape_route_trends: list[dict] = []
    heatmap_cells: list[SafetyMatrixCell] = []


class LocationResponse(CamelModel):
    id: str
    building_id: str
    floor_plan_id: str | None = None
    location_ref: str
    label: str
    origin: Coordinate3D
    route_points: list[Coordinate3D] = []
    exit_point: Coordinate3D
    created_at: datetime


class QrProvisionResponse(CamelModel):
    location_id: str
    guest_url: str
    qr_svg_url: str
    qr_png_url: str


class ComplianceReportRequest(CamelModel):
    building_id: str
    period_from: datetime
    period_to: datetime


class ComplianceReportResponse(CamelModel):
    report_id: str
    status: str = "pending"
