from pydantic import Field
from app.schemas.common import CamelModel, Coordinate3D


class GuestRouteResponse(CamelModel):
    location_ref: str
    origin: Coordinate3D
    route_points: list[Coordinate3D] = Field(default_factory=list)
    hazard_points: list[Coordinate3D] = Field(default_factory=list)
    safe_zones: list[Coordinate3D] = Field(default_factory=list)
    exit_point: Coordinate3D
