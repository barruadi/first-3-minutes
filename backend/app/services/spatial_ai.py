import asyncio
import io
import json
import re
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Protocol

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError
from pydantic import ValidationError
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import ApiException
from app.core.time import utc_now
from app.models import DeviceProfile, Location, SpatialMap, SpatialScan
from app.schemas.common import Coordinate3D, SpatialObject
from app.schemas.spatial import SpatialMapResponse


SPATIAL_PROMPT = """You are a spatial safety mapper. Analyze all 15 chronological room images.
Return exactly one JSON object and no markdown or commentary, using this schema:
{
  "origin": {"x": 0, "y": 0, "z": 0},
  "safeZones": [{"id":"safe-1","type":"SAFE_ZONE","label":"sturdy_table","position":{"x":0,"y":0,"z":-1},"confidence":0.9}],
  "hazardZones": [{"id":"hazard-1","type":"HAZARD_ZONE","label":"tall_cabinet","position":{"x":1,"y":0,"z":-2},"confidence":0.8}],
  "exitPoints": [{"id":"exit-1","type":"EXIT_POINT","label":"main_exit","position":{"x":0,"y":0,"z":-4},"confidence":0.9}]
}
Coordinates are approximate metres relative to the first camera pose: +x right, +y up, -z forward.
Use only SAFE_ZONE, HAZARD_ZONE, and EXIT_POINT. A sturdy shelter and a main exit are mandatory.
Do not invent precise objects that are unsupported by the images."""

FLOOR_PLAN_PROMPT_TEMPLATE = """You are a spatial safety mapper analyzing a LiDAR-generated 2D floor plan.

Image details:
- This is a top-down (bird's-eye) floor plan generated from an iPhone LiDAR depth scan.
- Image size: 512x512 pixels
- Scale: {scale:.4f} meters per pixel (room spans approximately {room_size:.1f} x {room_size:.1f} meters)
- White pixels (255) = open walkable floor
- Dark/black pixels (0–50) = walls, structural elements, dense furniture
- Light gray pixels (200–240) = areas not fully captured by the scan

Coordinate system: origin at the center of the image.
  +x = right, -x = left
  +z = downward in image, -z = upward in image
  y = 0 for all (floor level)
  1 pixel = {scale:.4f} meters

Identify and return safety-critical locations. Use the geometry visible in the floor plan:
- SAFE_ZONE: structural corners, alcoves, or areas near load-bearing walls (dense wall pixels around them)
- HAZARD_ZONE: open areas near doors/windows, or near isolated wall clusters (furniture that could fall)
- EXIT_POINT: gaps in the outer wall perimeter (door-width openings, ~0.8–1.2 m wide)

Return exactly one JSON object, no markdown, no commentary:
{{
  "origin": {{"x": 0, "y": 0, "z": 0}},
  "safeZones": [{{"id":"safe-1","type":"SAFE_ZONE","label":"structural_corner","position":{{"x":0,"y":0,"z":-1}},"confidence":0.8}}],
  "hazardZones": [{{"id":"hazard-1","type":"HAZARD_ZONE","label":"open_area","position":{{"x":1,"y":0,"z":-2}},"confidence":0.6}}],
  "exitPoints": [{{"id":"exit-1","type":"EXIT_POINT","label":"main_doorway","position":{{"x":0,"y":0,"z":-4}},"confidence":0.9}}]
}}

Rules:
- At least 1 SAFE_ZONE and 1 EXIT_POINT are mandatory.
- HAZARD_ZONE is optional.
- Labels for SAFE_ZONE: structural_corner, alcove, load_bearing_wall, under_stair
- Labels for HAZARD_ZONE: open_area, near_window, near_entrance, tall_furniture_cluster
- Labels for EXIT_POINT: main_doorway, emergency_exit, side_exit, stairway_exit
- Positions must be in meters from the image center (origin).
- Keep confidence between 0.5 and 0.95 — lower for inferred, higher for clearly visible geometry."""


@dataclass(frozen=True)
class ValidatedImage:
    data: bytes
    width: int
    height: int


class SpatialAIClient(Protocol):
    async def generate(self, images: list[ValidatedImage]) -> str: ...


class GeminiFloorPlanClient:
    async def generate_from_floor_plan(self, image: ValidatedImage, prompt: str) -> str:
        if not settings.gemini_api_key:
            raise ApiException(503, "SPATIAL_AI_UNAVAILABLE", "Spatial AI belum dikonfigurasi.")

        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.gemini_api_key)
        content: list[object] = [
            prompt,
            types.Part.from_bytes(data=image.data, mime_type="image/png"),
        ]
        async with client.aio as async_client:
            response = await async_client.models.generate_content(
                model=settings.gemini_model,
                contents=content,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )
        return response.text or ""


class GeminiSpatialClient:
    async def generate(self, images: list[ValidatedImage]) -> str:
        if not settings.gemini_api_key:
            raise ApiException(503, "SPATIAL_AI_UNAVAILABLE", "Spatial AI belum dikonfigurasi.")

        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.gemini_api_key)
        content: list[object] = [SPATIAL_PROMPT]
        content.extend(types.Part.from_bytes(data=item.data, mime_type="image/jpeg") for item in images)
        async with client.aio as async_client:
            response = await async_client.models.generate_content(
                model=settings.gemini_model,
                contents=content,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )
        return response.text or ""


def _clean_label(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9 _-]", "", value).strip()[:80]
    return cleaned or "unknown"


def extract_spatial_json(text: str, scan_id: str, now: datetime | None = None) -> SpatialMapResponse:
    candidate = text.strip()
    if candidate.startswith("```"):
        candidate = re.sub(r"^```(?:json)?\s*", "", candidate, flags=re.IGNORECASE)
        candidate = re.sub(r"\s*```$", "", candidate)
    start, end = candidate.find("{"), candidate.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("AI response does not contain a JSON object")
    raw = json.loads(candidate[start : end + 1])
    raw["scanId"] = scan_id
    raw["source"] = "gemini"
    raw["createdAt"] = (now or utc_now()).isoformat() + "Z"
    result = SpatialMapResponse.model_validate(raw)
    if not result.safe_zones or not result.exit_points:
        raise ValueError("Spatial map must include at least one safe zone and exit")
    for expected, items in (
        ("SAFE_ZONE", result.safe_zones),
        ("HAZARD_ZONE", result.hazard_zones),
        ("EXIT_POINT", result.exit_points),
    ):
        for item in items:
            if item.type != expected:
                raise ValueError(f"Unexpected spatial object type {item.type}")
            item.label = _clean_label(item.label)
    return result


def build_fallback(scan_id: str, now: datetime | None = None) -> SpatialMapResponse:
    return SpatialMapResponse(
        scan_id=scan_id,
        origin=Coordinate3D(x=0, y=0, z=0),
        safe_zones=[
            SpatialObject(
                id="safe-fallback-1",
                type="SAFE_ZONE",
                label="sturdy_table",
                position=Coordinate3D(x=1.2, y=0.0, z=-2.4),
                confidence=0.5,
            )
        ],
        hazard_zones=[
            SpatialObject(
                id="hazard-fallback-1",
                type="HAZARD_ZONE",
                label="tall_furniture",
                position=Coordinate3D(x=-1.5, y=0.0, z=-1.0),
                confidence=0.35,
            )
        ],
        exit_points=[
            SpatialObject(
                id="exit-fallback-1",
                type="EXIT_POINT",
                label="main_exit",
                position=Coordinate3D(x=2.1, y=0.0, z=-5.0),
                confidence=0.5,
            )
        ],
        source="fallback",
        created_at=now or utc_now(),
    )


async def validate_images(images: list[UploadFile]) -> tuple[list[ValidatedImage], int]:
    if len(images) != 15:
        raise ApiException(
            400,
            "SCAN_FRAME_COUNT_INVALID",
            f"Dibutuhkan tepat 15 frame JPEG; diterima {len(images)}.",
        )

    validated: list[ValidatedImage] = []
    total_bytes = 0
    for index, upload in enumerate(images):
        if upload.content_type not in {"image/jpeg", "image/jpg"}:
            raise ApiException(400, "SCAN_IMAGE_INVALID", f"Frame {index + 1} bukan JPEG.")
        data = await upload.read(settings.spatial_max_file_bytes + 1)
        if not data or len(data) > settings.spatial_max_file_bytes:
            raise ApiException(400, "SCAN_IMAGE_INVALID", f"Ukuran frame {index + 1} tidak valid.")
        total_bytes += len(data)
        if total_bytes > settings.spatial_max_payload_bytes:
            raise ApiException(413, "SCAN_PAYLOAD_TOO_LARGE", "Total payload scan melebihi 4 MB.")
        try:
            with Image.open(io.BytesIO(data)) as decoded:
                decoded.verify()
            with Image.open(io.BytesIO(data)) as decoded:
                if decoded.format != "JPEG":
                    raise ValueError("decoded image is not JPEG")
                width, height = decoded.size
        except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError):
            raise ApiException(400, "SCAN_IMAGE_INVALID", f"Frame {index + 1} rusak atau bukan JPEG.")
        if width <= 0 or height <= 0 or max(width, height) > settings.spatial_max_dimension:
            raise ApiException(400, "SCAN_IMAGE_INVALID", f"Dimensi frame {index + 1} tidak didukung.")
        validated.append(ValidatedImage(data=data, width=width, height=height))
    return validated, total_bytes


async def validate_floor_plan_image(upload: UploadFile) -> ValidatedImage:
    allowed = {"image/png", "image/x-png"}
    if upload.content_type not in allowed:
        raise ApiException(400, "FLOOR_PLAN_INVALID", "Denah lantai harus berformat PNG.")
    data = await upload.read(settings.spatial_max_payload_bytes + 1)
    if not data or len(data) > settings.spatial_max_payload_bytes:
        raise ApiException(400, "FLOOR_PLAN_TOO_LARGE", "Ukuran denah lantai tidak valid.")
    try:
        with Image.open(io.BytesIO(data)) as img:
            img.verify()
        with Image.open(io.BytesIO(data)) as img:
            if img.format not in {"PNG"}:
                raise ValueError("not PNG")
            width, height = img.size
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError):
        raise ApiException(400, "FLOOR_PLAN_INVALID", "Denah lantai rusak atau bukan PNG.")
    if width <= 0 or height <= 0 or max(width, height) > settings.spatial_max_dimension:
        raise ApiException(400, "FLOOR_PLAN_INVALID", "Dimensi denah lantai tidak didukung.")
    return ValidatedImage(data=data, width=width, height=height)


def _map_from_record(record: SpatialMap) -> SpatialMapResponse:
    return SpatialMapResponse(
        scan_id=record.scan_id,
        origin=Coordinate3D.model_validate(json.loads(record.origin_json)),
        safe_zones=[SpatialObject.model_validate(item) for item in json.loads(record.safe_zones_json)],
        hazard_zones=[SpatialObject.model_validate(item) for item in json.loads(record.hazard_zones_json)],
        exit_points=[SpatialObject.model_validate(item) for item in json.loads(record.exit_points_json)],
        source=record.source,
        created_at=record.created_at,
    )


class SpatialAIService:
    def __init__(self, client: SpatialAIClient | None = None) -> None:
        self.client = client or GeminiSpatialClient()
        self.floor_plan_client = GeminiFloorPlanClient()

    async def process_scan(
        self,
        db: Session,
        scan_id: str,
        installation_id: str,
        location_id: str | None,
        images: list[UploadFile],
    ) -> SpatialMapResponse:
        scan_id = scan_id.strip()
        installation_id = installation_id.strip()
        if not scan_id or len(scan_id) > 128 or not installation_id or len(installation_id) > 128:
            raise ApiException(422, "VALIDATION_ERROR", "scanId dan installationId wajib valid.")

        existing = db.scalar(select(SpatialScan).where(SpatialScan.scan_id == scan_id))
        if existing:
            if existing.installation_id != installation_id:
                raise ApiException(409, "SCAN_CONFLICT", "scanId sudah dipakai oleh instalasi lain.")
            existing_map = db.scalar(select(SpatialMap).where(SpatialMap.scan_id == scan_id))
            if existing_map:
                return _map_from_record(existing_map)

        validated, payload_bytes = await validate_images(images)
        location = None
        if location_id:
            location = db.scalar(
                select(Location).where(
                    Location.building_id == settings.demo_building_id,
                    or_(Location.id == location_id, Location.location_ref == location_id),
                )
            )

        if not existing:
            existing = SpatialScan(
                id=str(uuid.uuid4()),
                scan_id=scan_id,
                installation_id=installation_id,
                building_id=settings.demo_building_id,
                location_id=location.id if location else None,
                status="processing",
                frame_count=15,
                payload_bytes=payload_bytes,
            )
            db.add(existing)
        else:
            existing.status = "processing"
            existing.frame_count = 15
            existing.payload_bytes = payload_bytes
            existing.location_id = location.id if location else existing.location_id

        if db.get(DeviceProfile, installation_id) is None:
            db.add(DeviceProfile(installation_id=installation_id, safety_rating=0.0, tier="Silver"))
        db.commit()

        try:
            if not settings.gemini_api_key and settings.enable_spatial_fallback:
                result = build_fallback(scan_id)
            else:
                try:
                    raw = await asyncio.wait_for(
                        self.client.generate(validated),
                        timeout=settings.spatial_ai_timeout_seconds,
                    )
                except asyncio.TimeoutError:
                    existing.status = "failed"
                    db.commit()
                    raise ApiException(504, "SPATIAL_AI_TIMEOUT", "Analisis ruang melewati batas waktu delapan detik.")
                except ApiException:
                    existing.status = "failed"
                    db.commit()
                    raise
                except Exception:
                    existing.status = "failed"
                    db.commit()
                    raise ApiException(502, "SPATIAL_AI_UNAVAILABLE", "Layanan Spatial AI tidak tersedia.")
                try:
                    result = extract_spatial_json(raw, scan_id)
                except (json.JSONDecodeError, ValidationError, ValueError, TypeError):
                    if not settings.enable_spatial_fallback:
                        existing.status = "failed"
                        db.commit()
                        raise ApiException(502, "SPATIAL_MAP_INVALID", "Spatial AI menghasilkan peta yang tidak valid.")
                    result = build_fallback(scan_id)

            record = SpatialMap(
                id=str(uuid.uuid4()),
                scan_id=scan_id,
                origin_json=result.origin.model_dump_json(by_alias=True),
                safe_zones_json=json.dumps([item.model_dump(by_alias=True) for item in result.safe_zones]),
                hazard_zones_json=json.dumps([item.model_dump(by_alias=True) for item in result.hazard_zones]),
                exit_points_json=json.dumps([item.model_dump(by_alias=True) for item in result.exit_points]),
                source=result.source,
                created_at=result.created_at,
            )
            db.add(record)
            existing.status = "completed" if result.source == "gemini" else "fallback"
            existing.completed_at = result.created_at
            db.commit()
            return result
        except ApiException:
            raise
        except Exception:
            db.rollback()
            raise


    async def process_floor_plan_scan(
        self,
        db: Session,
        scan_id: str,
        installation_id: str,
        floor_plan: UploadFile,
        scale_meters_per_pixel: float,
    ) -> SpatialMapResponse:
        scan_id = scan_id.strip()
        installation_id = installation_id.strip()
        if not scan_id or len(scan_id) > 128 or not installation_id or len(installation_id) > 128:
            raise ApiException(422, "VALIDATION_ERROR", "scanId dan installationId wajib valid.")
        if scale_meters_per_pixel <= 0 or scale_meters_per_pixel > 10:
            raise ApiException(422, "VALIDATION_ERROR", "scaleMetersPerPixel harus antara 0 dan 10.")

        existing = db.scalar(select(SpatialScan).where(SpatialScan.scan_id == scan_id))
        if existing:
            if existing.installation_id != installation_id:
                raise ApiException(409, "SCAN_CONFLICT", "scanId sudah dipakai oleh instalasi lain.")
            existing_map = db.scalar(select(SpatialMap).where(SpatialMap.scan_id == scan_id))
            if existing_map:
                return _map_from_record(existing_map)

        validated = await validate_floor_plan_image(floor_plan)

        if not existing:
            existing = SpatialScan(
                id=str(uuid.uuid4()),
                scan_id=scan_id,
                installation_id=installation_id,
                building_id=settings.demo_building_id,
                location_id=None,
                status="processing",
                frame_count=1,
                payload_bytes=len(validated.data),
            )
            db.add(existing)
        else:
            existing.status = "processing"
            existing.frame_count = 1
            existing.payload_bytes = len(validated.data)

        if db.get(DeviceProfile, installation_id) is None:
            db.add(DeviceProfile(installation_id=installation_id, safety_rating=0.0, tier="Silver"))
        db.commit()

        room_size = validated.width * scale_meters_per_pixel
        prompt = FLOOR_PLAN_PROMPT_TEMPLATE.format(
            scale=scale_meters_per_pixel,
            room_size=room_size,
        )

        try:
            if not settings.gemini_api_key and settings.enable_spatial_fallback:
                result = build_fallback(scan_id)
            else:
                try:
                    raw = await asyncio.wait_for(
                        self.floor_plan_client.generate_from_floor_plan(validated, prompt),
                        timeout=settings.spatial_ai_timeout_seconds,
                    )
                except asyncio.TimeoutError:
                    existing.status = "failed"
                    db.commit()
                    raise ApiException(504, "SPATIAL_AI_TIMEOUT", "Analisis denah lantai melewati batas waktu.")
                except ApiException:
                    existing.status = "failed"
                    db.commit()
                    raise
                except Exception:
                    existing.status = "failed"
                    db.commit()
                    raise ApiException(502, "SPATIAL_AI_UNAVAILABLE", "Layanan Spatial AI tidak tersedia.")
                try:
                    result = extract_spatial_json(raw, scan_id)
                except (json.JSONDecodeError, ValidationError, ValueError, TypeError):
                    if not settings.enable_spatial_fallback:
                        existing.status = "failed"
                        db.commit()
                        raise ApiException(502, "SPATIAL_MAP_INVALID", "Spatial AI menghasilkan peta yang tidak valid.")
                    result = build_fallback(scan_id)

            record = SpatialMap(
                id=str(uuid.uuid4()),
                scan_id=scan_id,
                origin_json=result.origin.model_dump_json(by_alias=True),
                safe_zones_json=json.dumps([item.model_dump(by_alias=True) for item in result.safe_zones]),
                hazard_zones_json=json.dumps([item.model_dump(by_alias=True) for item in result.hazard_zones]),
                exit_points_json=json.dumps([item.model_dump(by_alias=True) for item in result.exit_points]),
                source=result.source,
                created_at=result.created_at,
            )
            db.add(record)
            existing.status = "completed" if result.source == "gemini" else "fallback"
            existing.completed_at = result.created_at
            db.commit()
            return result
        except ApiException:
            raise
        except Exception:
            db.rollback()
            raise


class SpatialAIServiceTestDouble(SpatialAIService):
    async def process_scan(self, *args, **kwargs) -> SpatialMapResponse:
        scan_id = kwargs.get("scan_id") or args[1]
        return build_fallback(scan_id)

    async def process_floor_plan_scan(self, *args, **kwargs) -> SpatialMapResponse:
        scan_id = kwargs.get("scan_id") or args[1]
        return build_fallback(scan_id)
