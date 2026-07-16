from datetime import datetime
from typing import Literal
from pydantic import Field
from app.schemas.common import CamelModel, Coordinate3D, SpatialObject


class SpatialMapResponse(CamelModel):
    scan_id: str
    origin: Coordinate3D
    safe_zones: list[SpatialObject] = Field(default_factory=list)
    hazard_zones: list[SpatialObject] = Field(default_factory=list)
    exit_points: list[SpatialObject] = Field(default_factory=list)
    source: Literal["gemini", "fallback"] = "fallback"
    created_at: datetime
