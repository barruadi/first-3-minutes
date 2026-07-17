import uuid
from collections import defaultdict
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, Query, Response, UploadFile
from sqlalchemy import delete as sa_delete, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.errors import ApiException
from app.core.time import utc_now
from app.models.building_scan import BuildingAnchor, BuildingScan, GuestDrillSession
from app.schemas.building import (
    AdminSessionsResponse,
    AnchorCreate,
    AnchorDetailResponse,
    AnchorResponse,
    AnchorStatsItem,
    AnchorUpdate,
    BuildingScanResponse,
    GuestSessionCreate,
    GuestSessionResponse,
    GuestStatsResponse,
)
from app.services.storage import storage_path

router = APIRouter(tags=["building"])

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

FLOOR_PLAN_MAX_BYTES = 50 * 1024 * 1024  # 50 MB


def _floor_plan_url(scan_id: str) -> str:
    return f"{settings.api_base_url}/uploads/floor_plans/{scan_id}.png"


def _anchor_response(anchor: BuildingAnchor) -> AnchorResponse:
    return AnchorResponse(
        id=anchor.id,
        scan_id=anchor.scan_id,
        name=anchor.name,
        pos_x=anchor.pos_x,
        pos_z=anchor.pos_z,
        is_exit=anchor.is_exit,
        created_at=anchor.created_at,
    )


def _session_response(session: GuestDrillSession, anchor_name: str) -> GuestSessionResponse:
    return GuestSessionResponse(
        id=session.id,
        anchor_id=session.anchor_id,
        anchor_name=anchor_name,
        duration_seconds=session.duration_seconds,
        completed=session.completed,
        used_ar=session.used_ar,
        created_at=session.created_at,
    )


def _get_scan_or_404(db: Session, scan_id: str) -> BuildingScan:
    scan = db.get(BuildingScan, scan_id)
    if scan is None:
        raise ApiException(404, "SCAN_NOT_FOUND", "Building scan tidak ditemukan.")
    return scan


def _get_anchor_or_404(db: Session, anchor_id: str) -> BuildingAnchor:
    anchor = db.get(BuildingAnchor, anchor_id)
    if anchor is None:
        raise ApiException(404, "ANCHOR_NOT_FOUND", "Anchor tidak ditemukan.")
    return anchor


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/buildings/scan", response_model=BuildingScanResponse, status_code=201)
async def create_building_scan(
    floor_plan: UploadFile = File(...),
    mesh: UploadFile | None = File(default=None),
    installation_id: str | None = Form(default=None),
    scale_meters_per_pixel: float = Form(default=0.01),
    origin_x: float = Form(default=0.0),
    origin_z: float = Form(default=0.0),
    db: Session = Depends(get_db),
) -> BuildingScanResponse:
    """Upload a floor plan (PNG) and optional mesh (OBJ) to create a building scan."""
    floor_plan_data = await floor_plan.read(FLOOR_PLAN_MAX_BYTES + 1)
    if not floor_plan_data:
        raise ApiException(400, "FLOOR_PLAN_EMPTY", "File floor plan kosong.")
    if len(floor_plan_data) > FLOOR_PLAN_MAX_BYTES:
        raise ApiException(413, "FLOOR_PLAN_TOO_LARGE", "File floor plan melebihi batas 50 MB.")

    scan_id = str(uuid.uuid4())

    fp_path = storage_path("floor_plans", f"{scan_id}.png")
    fp_path.write_bytes(floor_plan_data)

    mesh_path_str: str | None = None
    mesh_url: str | None = None
    if mesh is not None:
        mesh_data = await mesh.read()
        if mesh_data:
            mesh_file_path = storage_path("meshes", f"{scan_id}.obj")
            mesh_file_path.write_bytes(mesh_data)
            mesh_path_str = str(mesh_file_path)
            mesh_url = f"{settings.api_base_url}/uploads/meshes/{scan_id}.obj"

    scan = BuildingScan(
        id=scan_id,
        installation_id=installation_id or "unknown",
        floor_plan_path=str(fp_path),
        mesh_path=mesh_path_str,
        created_at=utc_now(),
        scale_meters_per_pixel=scale_meters_per_pixel,
        origin_x=origin_x,
        origin_z=origin_z,
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    return BuildingScanResponse(
        id=scan.id,
        floor_plan_url=_floor_plan_url(scan.id),
        mesh_url=mesh_url,
        created_at=scan.created_at,
        scale_meters_per_pixel=scan.scale_meters_per_pixel,
        origin_x=scan.origin_x,
        origin_z=scan.origin_z,
    )


@router.post("/buildings/{scan_id}/anchors", response_model=AnchorResponse, status_code=201)
def create_anchor(
    scan_id: str,
    body: AnchorCreate,
    db: Session = Depends(get_db),
) -> AnchorResponse:
    """Add a named QR anchor to a building scan."""
    _get_scan_or_404(db, scan_id)

    anchor = BuildingAnchor(
        id=str(uuid.uuid4()),
        scan_id=scan_id,
        name=body.name,
        pos_x=body.pos_x,
        pos_z=body.pos_z,
        is_exit=body.is_exit,
        created_at=utc_now(),
    )
    db.add(anchor)
    db.commit()
    db.refresh(anchor)
    return _anchor_response(anchor)


@router.get("/buildings/{scan_id}/anchors", response_model=list[AnchorResponse])
def list_anchors(
    scan_id: str,
    db: Session = Depends(get_db),
) -> list[AnchorResponse]:
    """List all anchors for a building scan."""
    _get_scan_or_404(db, scan_id)
    anchors = db.scalars(
        select(BuildingAnchor)
        .where(BuildingAnchor.scan_id == scan_id)
        .order_by(BuildingAnchor.created_at)
    ).all()
    return [_anchor_response(a) for a in anchors]


@router.delete("/buildings/{scan_id}/anchors/{anchor_id}", status_code=204)
def delete_anchor(
    scan_id: str,
    anchor_id: str,
    db: Session = Depends(get_db),
) -> Response:
    """Delete an anchor from a building scan."""
    _get_scan_or_404(db, scan_id)
    anchor = db.scalar(
        select(BuildingAnchor).where(
            BuildingAnchor.id == anchor_id,
            BuildingAnchor.scan_id == scan_id,
        )
    )
    if anchor is None:
        raise ApiException(404, "ANCHOR_NOT_FOUND", "Anchor tidak ditemukan dalam scan ini.")
    # Remove drill sessions that reference this anchor before deleting the anchor itself.
    db.execute(sa_delete(GuestDrillSession).where(GuestDrillSession.anchor_id == anchor_id))
    db.delete(anchor)
    db.commit()
    return Response(status_code=204)


@router.patch("/buildings/{scan_id}/anchors/{anchor_id}", response_model=AnchorResponse)
def update_anchor(
    scan_id: str,
    anchor_id: str,
    body: AnchorUpdate,
    db: Session = Depends(get_db),
) -> AnchorResponse:
    """Update anchor properties (e.g. toggle is_exit) without changing its ID."""
    _get_scan_or_404(db, scan_id)
    anchor = db.scalar(
        select(BuildingAnchor).where(
            BuildingAnchor.id == anchor_id,
            BuildingAnchor.scan_id == scan_id,
        )
    )
    if anchor is None:
        raise ApiException(404, "ANCHOR_NOT_FOUND", "Anchor tidak ditemukan dalam scan ini.")
    anchor.is_exit = body.is_exit
    db.commit()
    db.refresh(anchor)
    return _anchor_response(anchor)


@router.get("/anchors/{anchor_id}", response_model=AnchorDetailResponse)
def get_anchor_detail(
    anchor_id: str,
    db: Session = Depends(get_db),
) -> AnchorDetailResponse:
    """Get anchor detail for guest WebAR — includes floor plan URL and all sibling anchors."""
    anchor = _get_anchor_or_404(db, anchor_id)
    scan = _get_scan_or_404(db, anchor.scan_id)

    all_anchors = db.scalars(
        select(BuildingAnchor)
        .where(BuildingAnchor.scan_id == anchor.scan_id)
        .order_by(BuildingAnchor.created_at)
    ).all()

    floor_plan_url = _floor_plan_url(scan.id) if scan.floor_plan_path else None

    return AnchorDetailResponse(
        id=anchor.id,
        scan_id=anchor.scan_id,
        name=anchor.name,
        pos_x=anchor.pos_x,
        pos_z=anchor.pos_z,
        is_exit=anchor.is_exit,
        created_at=anchor.created_at,
        floor_plan_url=floor_plan_url,
        anchors=[_anchor_response(a) for a in all_anchors],
        scale_meters_per_pixel=scan.scale_meters_per_pixel,
        origin_x=scan.origin_x,
        origin_z=scan.origin_z,
    )


@router.post("/guest/drill-session", response_model=GuestSessionResponse, status_code=201)
def create_guest_drill_session(
    body: GuestSessionCreate,
    db: Session = Depends(get_db),
) -> GuestSessionResponse:
    """Submit guest evacuation drill metrics."""
    anchor = _get_anchor_or_404(db, body.anchor_id)

    session = GuestDrillSession(
        id=str(uuid.uuid4()),
        anchor_id=body.anchor_id,
        duration_seconds=body.duration_seconds,
        completed=body.completed,
        used_ar=body.used_ar,
        created_at=utc_now(),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return _session_response(session, anchor.name)


@router.get("/admin/guest-sessions", response_model=AdminSessionsResponse)
def list_guest_sessions(
    scan_id: str | None = Query(default=None, alias="scanId"),
    db: Session = Depends(get_db),
) -> AdminSessionsResponse:
    """List all guest drill sessions, optionally filtered by scan_id."""
    query = select(GuestDrillSession).order_by(GuestDrillSession.created_at.desc())

    if scan_id is not None:
        # Filter sessions whose anchor belongs to the given scan
        query = query.join(
            BuildingAnchor, GuestDrillSession.anchor_id == BuildingAnchor.id
        ).where(BuildingAnchor.scan_id == scan_id)

    sessions = db.scalars(query).all()

    # Batch-load anchor names
    anchor_ids = {s.anchor_id for s in sessions}
    anchors_by_id: dict[str, BuildingAnchor] = {}
    if anchor_ids:
        rows = db.scalars(
            select(BuildingAnchor).where(BuildingAnchor.id.in_(anchor_ids))
        ).all()
        anchors_by_id = {a.id: a for a in rows}

    items = [
        _session_response(s, anchors_by_id[s.anchor_id].name if s.anchor_id in anchors_by_id else "unknown")
        for s in sessions
    ]
    return AdminSessionsResponse(sessions=items)


@router.get("/buildings/scans", response_model=list[BuildingScanResponse])
def list_building_scans(db: Session = Depends(get_db)) -> list[BuildingScanResponse]:
    """List all building scans, newest first."""
    scans = db.scalars(
        select(BuildingScan).order_by(BuildingScan.created_at.desc())
    ).all()
    return [
        BuildingScanResponse(
            id=scan.id,
            floor_plan_url=_floor_plan_url(scan.id) if scan.floor_plan_path else None,
            mesh_url=f"{settings.api_base_url}/uploads/meshes/{scan.id}.obj" if scan.mesh_path else None,
            created_at=scan.created_at,
            scale_meters_per_pixel=scan.scale_meters_per_pixel,
            origin_x=scan.origin_x,
            origin_z=scan.origin_z,
        )
        for scan in scans
    ]


@router.get("/admin/guest-stats", response_model=GuestStatsResponse)
def get_guest_stats(db: Session = Depends(get_db)) -> GuestStatsResponse:
    """Aggregate guest drill session statistics grouped by anchor."""
    sessions = db.scalars(select(GuestDrillSession)).all()

    if not sessions:
        return GuestStatsResponse(
            total_sessions=0,
            completion_rate=0.0,
            avg_duration_seconds=None,
            bottleneck_anchor=None,
            anchor_stats=[],
        )

    # Load all referenced anchors
    anchor_ids = {s.anchor_id for s in sessions}
    anchors_by_id: dict[str, BuildingAnchor] = {}
    if anchor_ids:
        rows = db.scalars(
            select(BuildingAnchor).where(BuildingAnchor.id.in_(anchor_ids))
        ).all()
        anchors_by_id = {a.id: a for a in rows}

    # Group sessions by anchor_id
    grouped: dict[str, list[GuestDrillSession]] = defaultdict(list)
    for s in sessions:
        grouped[s.anchor_id].append(s)

    anchor_stats: list[AnchorStatsItem] = []
    for anchor_id, anchor_sessions in grouped.items():
        anchor = anchors_by_id.get(anchor_id)
        anchor_name = anchor.name if anchor else "unknown"
        scan_id = anchor.scan_id if anchor else "unknown"
        scan_count = len(anchor_sessions)
        completion_count = sum(1 for s in anchor_sessions if s.completed)
        completion_rate = completion_count / scan_count if scan_count else 0.0
        avg_duration = sum(s.duration_seconds for s in anchor_sessions) / scan_count if scan_count else None
        ar_used_count = sum(1 for s in anchor_sessions if s.used_ar)
        ar_usage_rate = ar_used_count / scan_count * 100 if scan_count else 0.0
        anchor_stats.append(
            AnchorStatsItem(
                anchor_id=anchor_id,
                anchor_name=anchor_name,
                scan_id=scan_id,
                scan_count=scan_count,
                completion_count=completion_count,
                completion_rate=completion_rate,
                avg_duration_seconds=avg_duration,
                ar_used_count=ar_used_count,
                ar_usage_rate=ar_usage_rate,
            )
        )

    total_sessions = len(sessions)
    total_completed = sum(1 for s in sessions if s.completed)
    overall_completion_rate = total_completed / total_sessions if total_sessions else 0.0
    overall_avg_duration = sum(s.duration_seconds for s in sessions) / total_sessions if total_sessions else None
    ar_used_count = sum(1 for s in sessions if s.used_ar)
    ar_usage_rate = ar_used_count / total_sessions * 100 if total_sessions else 0.0

    # Bottleneck anchor: highest avg duration among anchors with data
    bottleneck_anchor: str | None = None
    stats_with_duration = [a for a in anchor_stats if a.avg_duration_seconds is not None]
    if stats_with_duration:
        bottleneck = max(stats_with_duration, key=lambda a: a.avg_duration_seconds or 0.0)
        bottleneck_anchor = bottleneck.anchor_name

    return GuestStatsResponse(
        total_sessions=total_sessions,
        completion_rate=overall_completion_rate,
        avg_duration_seconds=overall_avg_duration,
        bottleneck_anchor=bottleneck_anchor,
        anchor_stats=anchor_stats,
        ar_used_count=ar_used_count,
        ar_usage_rate=ar_usage_rate,
    )
