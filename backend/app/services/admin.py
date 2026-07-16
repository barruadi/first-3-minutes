import io
import json
import uuid
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError
from sqlalchemy import desc, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import ApiException
from app.core.time import utc_now
from app.models import Building, Drill, FloorPlan, Location, SpatialScan
from app.schemas.admin import (
    AnalyticsSummaryResponse,
    FloorPlanResponse,
    LocationCreateRequest,
    LocationResponse,
    SafetyMatrixCell,
)
from app.schemas.common import Coordinate3D
from app.services.storage import storage_path


def _building(db: Session) -> Building:
    building = db.get(Building, settings.demo_building_id)
    if building is None:
        raise ApiException(503, "BUILDING_NOT_CONFIGURED", "Demo building belum dikonfigurasi.")
    return building


def _location_response(location: Location) -> LocationResponse:
    return LocationResponse(
        id=location.id,
        building_id=location.building_id,
        floor_plan_id=location.floor_plan_id,
        location_ref=location.location_ref,
        label=location.label,
        origin=Coordinate3D.model_validate(json.loads(location.origin_json)),
        route_points=[Coordinate3D.model_validate(item) for item in json.loads(location.route_points_json)],
        exit_point=Coordinate3D.model_validate(json.loads(location.exit_point_json)),
        created_at=location.created_at,
    )


def get_analytics(
    db: Session,
    period_from: datetime | None = None,
    period_to: datetime | None = None,
) -> AnalyticsSummaryResponse:
    _building(db)
    scan_query = select(SpatialScan).where(SpatialScan.building_id == settings.demo_building_id)
    drill_query = select(Drill).where(Drill.building_id == settings.demo_building_id)
    if period_from:
        scan_query = scan_query.where(SpatialScan.created_at >= period_from)
        drill_query = drill_query.where(Drill.created_at >= period_from)
    if period_to:
        scan_query = scan_query.where(SpatialScan.created_at <= period_to)
        drill_query = drill_query.where(Drill.created_at <= period_to)
    scans = db.scalars(scan_query).all()
    drills = db.scalars(drill_query).all()

    residents = {item.installation_id for item in scans}
    participants = {item.installation_id for item in drills}
    participation = (100.0 * len(participants) / len(residents)) if residents else 0.0
    average_shelter = round(sum(item.reaction_time_ms for item in drills) / len(drills)) if drills else 0

    trends: dict[str, list[int]] = defaultdict(list)
    for drill in drills:
        year, week, _ = drill.created_at.isocalendar()
        trends[f"{year}-W{week:02d}"].append(drill.evacuation_time_ms)
    trend_rows = [
        {"period": period, "averageEvacuationTimeMs": round(sum(values) / len(values))}
        for period, values in sorted(trends.items())
    ]

    scans_by_id = {item.scan_id: item for item in scans}
    locations = {
        item.id: item
        for item in db.scalars(
            select(Location).where(Location.building_id == settings.demo_building_id)
        ).all()
    }
    grouped: dict[str, list[Drill]] = defaultdict(list)
    for drill in drills:
        scan = scans_by_id.get(drill.scan_id)
        location = locations.get(scan.location_id) if scan else None
        grouped[location.location_ref if location else "unassigned"].append(drill)
    heatmap = []
    for location_ref, values in sorted(grouped.items()):
        failures = sum(1 for item in values if not item.accepted)
        heatmap.append(
            SafetyMatrixCell(
                location_ref=location_ref,
                failure_rate_percentage=round(100.0 * failures / len(values), 2),
                average_evacuation_time_ms=round(
                    sum(item.evacuation_time_ms for item in values) / len(values)
                ),
                sample_count=len(values),
            )
        )
    return AnalyticsSummaryResponse(
        building_id=settings.demo_building_id,
        participation_rate_percentage=round(participation, 2),
        average_shelter_time_ms=average_shelter,
        escape_route_trends=trend_rows,
        heatmap_cells=heatmap,
    )


def _floor_response(item: FloorPlan) -> FloorPlanResponse:
    return FloorPlanResponse(
        id=item.id,
        building_id=item.building_id,
        name=item.name,
        file_url=item.file_url,
        metadata=json.loads(item.metadata_json or "{}"),
        created_at=item.created_at,
    )


async def create_floor_plan(db: Session, upload: UploadFile, name: str | None) -> FloorPlanResponse:
    _building(db)
    data = await upload.read(settings.floor_plan_max_bytes + 1)
    if not data or len(data) > settings.floor_plan_max_bytes:
        raise ApiException(413, "FLOOR_PLAN_TOO_LARGE", "Floor plan melebihi batas 10 MB.")
    content_type = upload.content_type or ""
    extension = ""
    width = height = None
    if content_type == "application/pdf" and data.startswith(b"%PDF-"):
        extension = ".pdf"
    elif content_type in {"image/png", "image/jpeg", "image/jpg"}:
        try:
            with Image.open(io.BytesIO(data)) as image:
                image.verify()
            with Image.open(io.BytesIO(data)) as image:
                if image.format not in {"PNG", "JPEG"}:
                    raise ValueError
                extension = ".png" if image.format == "PNG" else ".jpg"
                width, height = image.size
        except (UnidentifiedImageError, OSError, ValueError):
            raise ApiException(400, "FLOOR_PLAN_INVALID", "File floor plan tidak valid.")
    else:
        raise ApiException(400, "FLOOR_PLAN_INVALID", "Gunakan floor plan PNG, JPEG, atau PDF.")

    floor_id = str(uuid.uuid4())
    path = storage_path("floorplans", f"{floor_id}{extension}")
    path.write_bytes(data)
    item = FloorPlan(
        id=floor_id,
        building_id=settings.demo_building_id,
        name=(name or Path(upload.filename or "Floor plan").stem or "Floor plan")[:160],
        file_url=f"/api/admin/floor-plans/{floor_id}/file",
        metadata_json=json.dumps(
            {"contentType": content_type, "sizeBytes": len(data), "width": width, "height": height}
        ),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _floor_response(item)


def list_floor_plans(db: Session) -> list[FloorPlanResponse]:
    _building(db)
    rows = db.scalars(
        select(FloorPlan)
        .where(FloorPlan.building_id == settings.demo_building_id)
        .order_by(desc(FloorPlan.created_at))
    ).all()
    return [_floor_response(item) for item in rows]


def get_floor_plan(db: Session, floor_plan_id: str) -> FloorPlanResponse:
    item = db.scalar(
        select(FloorPlan).where(
            FloorPlan.id == floor_plan_id,
            FloorPlan.building_id == settings.demo_building_id,
        )
    )
    if item is None:
        raise ApiException(404, "FLOOR_PLAN_NOT_FOUND", "Floor plan tidak ditemukan.")
    return _floor_response(item)


def floor_plan_file(db: Session, floor_plan_id: str) -> tuple[Path, str]:
    item = db.scalar(
        select(FloorPlan).where(
            FloorPlan.id == floor_plan_id,
            FloorPlan.building_id == settings.demo_building_id,
        )
    )
    if item is None or not item.metadata_json:
        raise ApiException(404, "FLOOR_PLAN_NOT_FOUND", "Floor plan tidak ditemukan.")
    metadata = json.loads(item.metadata_json)
    candidates = list((storage_path("floorplans", "placeholder").parent).glob(f"{item.id}.*"))
    if not candidates:
        raise ApiException(404, "FLOOR_PLAN_NOT_FOUND", "File floor plan tidak ditemukan.")
    return candidates[0], metadata.get("contentType", "application/octet-stream")


def create_location(db: Session, body: LocationCreateRequest) -> LocationResponse:
    _building(db)
    if body.floor_plan_id:
        floor = db.scalar(
            select(FloorPlan).where(
                FloorPlan.id == body.floor_plan_id,
                FloorPlan.building_id == settings.demo_building_id,
            )
        )
        if floor is None:
            raise ApiException(404, "FLOOR_PLAN_NOT_FOUND", "Floor plan tidak ditemukan dalam demo building.")
    item = Location(
        id=str(uuid.uuid4()),
        building_id=settings.demo_building_id,
        floor_plan_id=body.floor_plan_id,
        location_ref=body.location_ref,
        label=body.label,
        origin_json=body.origin.model_dump_json(by_alias=True),
        route_points_json=json.dumps([point.model_dump(by_alias=True) for point in body.route_points]),
        exit_point_json=body.exit_point.model_dump_json(by_alias=True),
    )
    db.add(item)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ApiException(409, "LOCATION_CONFLICT", "locationRef sudah ada dalam demo building.")
    db.refresh(item)
    return _location_response(item)


def list_locations(db: Session) -> list[LocationResponse]:
    _building(db)
    rows = db.scalars(
        select(Location)
        .where(Location.building_id == settings.demo_building_id)
        .order_by(Location.label)
    ).all()
    return [_location_response(item) for item in rows]


def get_location(db: Session, location_id: str) -> Location:
    location = db.scalar(
        select(Location).where(
            Location.id == location_id,
            Location.building_id == settings.demo_building_id,
        )
    )
    if location is None:
        raise ApiException(404, "LOCATION_NOT_FOUND", "Lokasi tidak ditemukan dalam demo building.")
    return location
