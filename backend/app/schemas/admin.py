from datetime import datetime
from typing import Any, Literal
from pydantic import Field
from app.schemas.common import CamelModel, Coordinate3D


class SafetyMatrixCell(CamelModel):
    location_ref: str
    failure_rate_percentage: float = Field(ge=0, le=100)
    average_evacuation_time_ms: int = Field(ge=0)
    sample_count: int = Field(ge=0)


class EscapeRouteTrendPoint(CamelModel):
    """Satu titik trend. `period` memakai ISO week: YYYY-Www (mis. 2026-W29)."""

    period: str = Field(pattern=r"^\d{4}-W\d{2}$")
    average_evacuation_time_ms: int = Field(ge=0)


class AnalyticsSummaryResponse(CamelModel):
    """GET /api/admin/analytics — FROZEN v1 (architecture.md §8.6).

    `escape_route_trends` sebelumnya bertipe list[dict] tanpa validasi, sehingga
    Domain 4 dapat menerima bentuk trend apa pun tanpa terdeteksi contract test.
    `building_id` diisi server dari DEMO_BUILDING_ID; client tidak mengirimnya.
    """

    building_id: str
    participation_rate_percentage: float = Field(ge=0, le=100)
    average_shelter_time_ms: int = Field(ge=0)
    escape_route_trends: list[EscapeRouteTrendPoint] = []
    heatmap_cells: list[SafetyMatrixCell] = []


class FloorPlanResponse(CamelModel):
    id: str
    building_id: str
    name: str
    file_url: str
    metadata: dict[str, Any] | None = None
    created_at: datetime


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
    """POST /api/admin/compliance-reports — FROZEN v1.

    TIDAK memuat building_id. Server SELALU memakai DEMO_BUILDING_ID dari
    settings dan mengabaikan scope building dari client (architecture.md §10.6,
    §11). Field building_id dihapus pada freeze v1 karena memaksa Domain 4
    mengirim field yang wajib ditolak Domain 3.
    """

    period_from: datetime
    period_to: datetime


ComplianceReportStatus = Literal["pending", "ready", "failed"]


class ComplianceReportResponse(CamelModel):
    report_id: str
    status: ComplianceReportStatus = "pending"
    #: Terisi hanya ketika status == "ready".
    download_url: str | None = None
