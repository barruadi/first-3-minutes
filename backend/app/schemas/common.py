"""Mirror Pydantic dari frontend/packages/contracts — FROZEN v1.

Seluruh interface HTTP memakai camelCase; Python internal memakai snake_case
dengan alias conversion terpusat pada CamelModel (environment.md §13).

Enum di bawah WAJIB identik dengan Zod pada packages/contracts. Sebelum freeze
v1 field-field ini bertipe `str` bebas, sehingga backend menerima nilai yang
ditolak TypeScript (mis. tier="Bronze") tanpa terdeteksi contract test.
"""
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=lambda s: "".join(
        w.capitalize() if i else w for i, w in enumerate(s.split("_"))
    ))


# --- Enum yang dibekukan bersama TypeScript ---

Tier = Literal["Platinum", "Gold", "Silver"]

SpatialObjectType = Literal["SAFE_ZONE", "HAZARD_ZONE", "EXIT_POINT"]

SpatialMapSource = Literal["gemini", "fallback"]

ErrorCode = Literal[
    "VALIDATION_ERROR",
    "SCAN_FRAME_COUNT_INVALID",
    "SCAN_IMAGE_INVALID",
    "SCAN_PAYLOAD_TOO_LARGE",
    "SPATIAL_AI_TIMEOUT",
    "SPATIAL_MAP_INVALID",
    "SCAN_NOT_FOUND",
    "DRILL_METRICS_INVALID",
    "BUILDING_SCOPE_FORBIDDEN",
    "LOCATION_NOT_FOUND",
    "QR_TOKEN_INVALID",
    "PDF_GENERATION_FAILED",
    "INTERNAL_ERROR",
]

# HTTP mapping FROZEN — harus identik dengan ERROR_HTTP_STATUS pada contracts.
ERROR_HTTP_STATUS: dict[str, int] = {
    "SPATIAL_AI_TIMEOUT": 504,
    "SCAN_NOT_FOUND": 404,
    "LOCATION_NOT_FOUND": 404,
    "QR_TOKEN_INVALID": 404,
    "BUILDING_SCOPE_FORBIDDEN": 403,
    "PDF_GENERATION_FAILED": 500,
    "INTERNAL_ERROR": 500,
}


class ApiErrorBody(BaseModel):
    code: str
    message: str
    details: Any = None


class ApiError(BaseModel):
    error: ApiErrorBody


class Coordinate3D(CamelModel):
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0


class SpatialObject(CamelModel):
    id: str
    type: SpatialObjectType
    label: str
    position: Coordinate3D
    confidence: float | None = None
