import math
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, field_validator


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=lambda s: "".join(
        w.capitalize() if i else w for i, w in enumerate(s.split("_"))
    ))


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

    @field_validator("x", "y", "z")
    @classmethod
    def finite_coordinate(cls, value: float) -> float:
        if not math.isfinite(value) or abs(value) > 10_000:
            raise ValueError("coordinate must be finite and within bounds")
        return value


class SpatialObject(CamelModel):
    id: str
    type: Literal["SAFE_ZONE", "HAZARD_ZONE", "EXIT_POINT"]
    label: str
    position: Coordinate3D
    confidence: float | None = None

    @field_validator("confidence")
    @classmethod
    def confidence_range(cls, value: float | None) -> float | None:
        if value is not None and not 0 <= value <= 1:
            raise ValueError("confidence must be between 0 and 1")
        return value
