from datetime import datetime
from pydantic import Field
from app.schemas.common import CamelModel


class BuildingScanResponse(CamelModel):
    id: str
    floor_plan_url: str | None = None
    mesh_url: str | None = None
    created_at: datetime
    scale_meters_per_pixel: float = 0.01
    origin_x: float = 0.0
    origin_z: float = 0.0


class AnchorCreate(CamelModel):
    name: str
    pos_x: float
    pos_z: float
    is_exit: bool = False


class AnchorUpdate(CamelModel):
    is_exit: bool


class AnchorResponse(CamelModel):
    id: str
    scan_id: str
    name: str
    pos_x: float
    pos_z: float
    is_exit: bool
    created_at: datetime


class AnchorDetailResponse(CamelModel):
    id: str
    scan_id: str
    name: str
    pos_x: float
    pos_z: float
    is_exit: bool
    created_at: datetime
    floor_plan_url: str | None = None
    anchors: list[AnchorResponse] = Field(default_factory=list)
    scale_meters_per_pixel: float = 0.01
    origin_x: float = 0.0
    origin_z: float = 0.0


class GuestSessionCreate(CamelModel):
    anchor_id: str
    duration_seconds: float
    completed: bool = True
    used_ar: bool = False


class GuestSessionResponse(CamelModel):
    id: str
    anchor_id: str
    anchor_name: str
    duration_seconds: float
    completed: bool
    used_ar: bool = False
    created_at: datetime


class AdminSessionsResponse(CamelModel):
    sessions: list[GuestSessionResponse] = Field(default_factory=list)


class AnchorStatsItem(CamelModel):
    anchor_id: str
    anchor_name: str
    scan_id: str
    scan_count: int
    completion_count: int
    completion_rate: float
    avg_duration_seconds: float | None = None
    ar_used_count: int = 0
    ar_usage_rate: float = 0.0


class GuestStatsResponse(CamelModel):
    total_sessions: int
    completion_rate: float
    avg_duration_seconds: float | None = None
    bottleneck_anchor: str | None = None
    anchor_stats: list[AnchorStatsItem] = Field(default_factory=list)
    ar_used_count: int = 0
    ar_usage_rate: float = 0.0
