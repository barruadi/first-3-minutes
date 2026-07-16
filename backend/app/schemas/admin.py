from datetime import datetime
from pydantic import Field, field_validator
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
    escape_route_trends: list[dict] = Field(default_factory=list)
    heatmap_cells: list[SafetyMatrixCell] = Field(default_factory=list)


class LocationResponse(CamelModel):
    id: str
    building_id: str
    floor_plan_id: str | None = None
    location_ref: str
    label: str
    origin: Coordinate3D
    route_points: list[Coordinate3D] = Field(default_factory=list)
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


class FloorPlanResponse(CamelModel):
    id: str
    building_id: str
    name: str
    file_url: str | None = None
    metadata: dict = Field(default_factory=dict)
    created_at: datetime


class FloorPlanListResponse(CamelModel):
    items: list[FloorPlanResponse] = Field(default_factory=list)


class LocationCreateRequest(CamelModel):
    building_id: str | None = None
    floor_plan_id: str | None = None
    location_ref: str
    label: str
    origin: Coordinate3D = Field(default_factory=Coordinate3D)
    route_points: list[Coordinate3D]
    exit_point: Coordinate3D

    @field_validator("location_ref", "label")
    @classmethod
    def non_empty(cls, value: str) -> str:
        value = value.strip()
        if not value or len(value) > 160:
            raise ValueError("value must contain 1-160 characters")
        return value

    @field_validator("route_points")
    @classmethod
    def route_size(cls, value: list[Coordinate3D]) -> list[Coordinate3D]:
        if not 1 <= len(value) <= 100:
            raise ValueError("routePoints must contain 1-100 points")
        return value


class ComplianceReportStatusResponse(CamelModel):
    report_id: str
    status: str
    download_url: str | None = None
    generated_at: datetime | None = None
