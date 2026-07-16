from datetime import datetime
from pydantic import model_validator
from app.schemas.common import (
    CamelModel,
    Coordinate3D,
    SpatialObject,
    SpatialMapSource,
)


class SpatialMapResponse(CamelModel):
    """Mirror SpatialMapSchema — FROZEN v1 (architecture.md §8.3).

    Minimum satu safe zone dan satu exit point WAJIB. Bila Gemini tidak
    menghasilkan minimum tersebut, service menerapkan fallback sebelum
    membangun response; validator ini adalah jaring pengaman terakhir agar
    Domain 2 tidak pernah menerima map yang tidak dapat dijalankan.

    `source` tidak lagi memiliki default. Pemanggil wajib menyatakan secara
    eksplisit apakah map berasal dari gemini atau fallback — default "fallback"
    sebelumnya dapat menyembunyikan map gemini yang salah label.
    """

    scan_id: str
    origin: Coordinate3D
    safe_zones: list[SpatialObject] = []
    hazard_zones: list[SpatialObject] = []
    exit_points: list[SpatialObject] = []
    source: SpatialMapSource
    created_at: datetime

    @model_validator(mode="after")
    def enforce_drill_minimum(self) -> "SpatialMapResponse":
        if not self.safe_zones:
            raise ValueError("SpatialMap membutuhkan minimal satu safeZone")
        if not self.exit_points:
            raise ValueError("SpatialMap membutuhkan minimal satu exitPoint")
        return self
