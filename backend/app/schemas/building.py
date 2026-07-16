from datetime import datetime
from pydantic import Field
from app.schemas.common import CamelModel


class BuildingScanResponse(CamelModel):
    id: str
    floor_plan_url: str | None = None
    mesh_url: str | None = None
    created_at: datetime


class AnchorCreate(CamelModel):
    name: str
    pos_x: float
    pos_z: float
    is_exit: bool = False


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


class GuestSessionCreate(CamelModel):
    anchor_id: str
    duration_seconds: float
    completed: bool = True


class GuestSessionResponse(CamelModel):
    id: str
    anchor_id: str
    anchor_name: str
    duration_seconds: float
    completed: bool
    created_at: datetime


class AdminSessionsResponse(CamelModel):
    sessions: list[GuestSessionResponse] = Field(default_factory=list)
