from datetime import datetime
from app.schemas.common import CamelModel, Coordinate3D, SpatialObject


class SpatialMapResponse(CamelModel):
    scan_id: str
    origin: Coordinate3D
    safe_zones: list[SpatialObject] = []
    hazard_zones: list[SpatialObject] = []
    exit_points: list[SpatialObject] = []
    source: str = "fallback"
    created_at: datetime
