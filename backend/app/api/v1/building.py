import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, Query, Response, UploadFile
from sqlalchemy import select
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
    BuildingScanResponse,
    GuestSessionCreate,
    GuestSessionResponse,
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
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    return BuildingScanResponse(
        id=scan.id,
        floor_plan_url=_floor_plan_url(scan.id),
        mesh_url=mesh_url,
        created_at=scan.created_at,
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
    db.delete(anchor)
    db.commit()
    return Response(status_code=204)


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
