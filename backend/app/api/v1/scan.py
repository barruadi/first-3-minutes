from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from app.schemas.spatial import SpatialMapResponse
from app.services.spatial_ai import SpatialAIService

router = APIRouter(prefix="/scans", tags=["scan"])
spatial_ai = SpatialAIService()


@router.post("/spatial-map", response_model=SpatialMapResponse)
async def create_spatial_map(
    scan_id: str = Form(...),
    installation_id: str = Form(...),
    location_id: str = Form(default="floor-4-room-402"),
    images: list[UploadFile] = File(...),
):
    if len(images) != 15:
        raise HTTPException(400, detail={"error": {"code": "INVALID_FRAME_COUNT", "message": f"Expected 15 frames, got {len(images)}", "details": None}})

    for img in images:
        if img.content_type not in ("image/jpeg", "image/jpg"):
            raise HTTPException(400, detail={"error": {"code": "INVALID_MIME", "message": f"Expected JPEG, got {img.content_type}", "details": None}})

    # Placeholder: Domain 3 implements full Gemini pipeline
    result = await spatial_ai.process_scan(scan_id=scan_id, images=images)
    return result
