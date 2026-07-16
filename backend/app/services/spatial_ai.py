from datetime import datetime
from fastapi import UploadFile
from app.schemas.spatial import SpatialMapResponse
from app.schemas.common import Coordinate3D, SpatialObject
from app.core.config import settings


class SpatialAIService:
    """
    Spatial AI service interface.
    Bootstrap: returns fallback fixture only.
    Domain 3 implements full Gemini multimodal pipeline with 8s hard timeout.
    """

    async def process_scan(self, scan_id: str, images: list[UploadFile]) -> SpatialMapResponse:
        if not settings.enable_spatial_fallback:
            raise NotImplementedError("Gemini pipeline not implemented in bootstrap")

        return self._build_fallback(scan_id)

    def _build_fallback(self, scan_id: str) -> SpatialMapResponse:
        return SpatialMapResponse(
            scan_id=scan_id,
            origin=Coordinate3D(x=0, y=0, z=0),
            safe_zones=[
                SpatialObject(id="safe-1", type="SAFE_ZONE", label="sturdy_table",
                              position=Coordinate3D(x=1.2, y=0.0, z=-2.4), confidence=0.91)
            ],
            hazard_zones=[
                SpatialObject(id="hazard-1", type="HAZARD_ZONE", label="tall_cabinet",
                              position=Coordinate3D(x=-1.5, y=0.0, z=-1.0), confidence=0.85)
            ],
            exit_points=[
                SpatialObject(id="exit-1", type="EXIT_POINT", label="main_door",
                              position=Coordinate3D(x=2.1, y=0.0, z=-5.0), confidence=0.97)
            ],
            source="fallback",
            created_at=datetime.utcnow(),
        )


# Test double for use in tests
class SpatialAIServiceTestDouble(SpatialAIService):
    async def process_scan(self, scan_id: str, images: list[UploadFile]) -> SpatialMapResponse:
        return self._build_fallback(scan_id)
