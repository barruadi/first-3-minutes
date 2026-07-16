from typing import Any
from pydantic import BaseModel, ConfigDict


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


class SpatialObject(CamelModel):
    id: str
    type: str
    label: str
    position: Coordinate3D
    confidence: float | None = None
