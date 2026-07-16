from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.spatial import SpatialMapResponse
from app.services.spatial_ai import SpatialAIService

router = APIRouter(prefix="/scans", tags=["scan"])
spatial_ai = SpatialAIService()


@router.post("/spatial-map", response_model=SpatialMapResponse)
async def create_spatial_map(
    scan_id: str = Form(..., alias="scanId"),
    installation_id: str = Form(..., alias="installationId"),
    location_id: str | None = Form(default=None, alias="locationId"),
    images: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    return await spatial_ai.process_scan(
        db=db,
        scan_id=scan_id,
        installation_id=installation_id,
        location_id=location_id,
        images=images,
    )


@router.post("/floor-plan", response_model=SpatialMapResponse)
async def create_floor_plan_spatial_map(
    scan_id: str = Form(..., alias="scanId"),
    installation_id: str = Form(..., alias="installationId"),
    floor_plan: UploadFile = File(..., alias="floorPlan"),
    scale_meters_per_pixel: float = Form(default=0.05, alias="scaleMetersPerPixel"),
    db: Session = Depends(get_db),
):
    return await spatial_ai.process_floor_plan_scan(
        db=db,
        scan_id=scan_id,
        installation_id=installation_id,
        floor_plan=floor_plan,
        scale_meters_per_pixel=scale_meters_per_pixel,
    )
