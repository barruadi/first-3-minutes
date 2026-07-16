from app.schemas.common import CamelModel, Coordinate3D


class GuestRouteResponse(CamelModel):
    location_ref: str
    origin: Coordinate3D
    route_points: list[Coordinate3D] = []
    hazard_points: list[Coordinate3D] = []
    safe_zones: list[Coordinate3D] = []
    exit_point: Coordinate3D
