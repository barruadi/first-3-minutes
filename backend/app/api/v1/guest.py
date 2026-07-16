from fastapi import APIRouter, HTTPException
from app.schemas.guest import GuestRouteResponse
from app.schemas.common import Coordinate3D

router = APIRouter(prefix="/guest", tags=["guest"])

# Demo fixture token mapping
_DEMO_TOKENS = {
    "demo-token-loc-demo-001": "floor-4-room-402",
}


@router.get("/rescue/{token}", response_model=GuestRouteResponse)
def get_guest_route(token: str):
    # Placeholder: Domain 3 implements real token hash lookup
    if token not in _DEMO_TOKENS and not token.startswith("demo-token-"):
        raise HTTPException(404, detail={"error": {"code": "INVALID_TOKEN", "message": "Token tidak valid.", "details": None}})

    return GuestRouteResponse(
        location_ref="floor-4-room-402",
        origin=Coordinate3D(x=0, y=0, z=0),
        route_points=[Coordinate3D(x=0, y=0, z=-1.5), Coordinate3D(x=1.2, y=0, z=-3.0)],
        hazard_points=[],
        safe_zones=[],
        exit_point=Coordinate3D(x=2.1, y=0, z=-5.0),
    )
