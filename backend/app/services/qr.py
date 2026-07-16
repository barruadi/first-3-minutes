import hashlib
import io
import json
import secrets
import uuid
from pathlib import Path

import qrcode
import qrcode.image.svg
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import ApiException
from app.core.time import utc_now
from app.models import Location, QrToken, SpatialMap, SpatialScan
from app.schemas.admin import QrProvisionResponse
from app.schemas.common import Coordinate3D, SpatialObject
from app.schemas.guest import GuestRouteResponse
from app.services.admin import get_location
from app.services.storage import storage_path


def hash_token(token: str) -> str:
    material = f"{settings.qr_token_secret}:{token}".encode("utf-8")
    return hashlib.sha256(material).hexdigest()


def generate_qr(db: Session, location_id: str) -> QrProvisionResponse:
    get_location(db, location_id)
    token = secrets.token_urlsafe(32)
    token_hash = hash_token(token)
    qr_id = str(uuid.uuid4())
    guest_url = f"{settings.guest_base_url.rstrip('/')}/rescue/{token}"

    svg_buffer = io.BytesIO()
    svg_image = qrcode.make(guest_url, image_factory=qrcode.image.svg.SvgPathImage, border=4)
    svg_image.save(svg_buffer)
    png_buffer = io.BytesIO()
    png_image = qrcode.make(guest_url, error_correction=qrcode.constants.ERROR_CORRECT_M, border=4, box_size=16)
    png_image.save(png_buffer, format="PNG")
    storage_path("qr", f"{qr_id}.svg").write_bytes(svg_buffer.getvalue())
    storage_path("qr", f"{qr_id}.png").write_bytes(png_buffer.getvalue())

    db.add(
        QrToken(
            id=qr_id,
            token_hash=token_hash,
            location_id=location_id,
            created_at=utc_now(),
            expires_at=None,
        )
    )
    db.commit()
    return QrProvisionResponse(
        location_id=location_id,
        guest_url=guest_url,
        qr_svg_url=f"/api/admin/qr/{qr_id}.svg",
        qr_png_url=f"/api/admin/qr/{qr_id}.png",
    )


def qr_file(db: Session, qr_id: str, extension: str) -> tuple[Path, str]:
    token = db.get(QrToken, qr_id)
    if token is None:
        raise ApiException(404, "QR_TOKEN_INVALID", "QR tidak ditemukan.")
    extension = extension.lower()
    if extension not in {"svg", "png"}:
        raise ApiException(404, "QR_TOKEN_INVALID", "Format QR tidak ditemukan.")
    path = storage_path("qr", f"{qr_id}.{extension}")
    if not path.exists():
        raise ApiException(404, "QR_TOKEN_INVALID", "File QR tidak ditemukan.")
    return path, "image/svg+xml" if extension == "svg" else "image/png"


def resolve_guest_route(db: Session, raw_token: str) -> GuestRouteResponse:
    if not raw_token or len(raw_token) > 256:
        raise ApiException(404, "QR_TOKEN_INVALID", "Token tidak valid atau kedaluwarsa.")
    now = utc_now()
    token = db.scalar(select(QrToken).where(QrToken.token_hash == hash_token(raw_token)))
    if token is None or token.revoked_at is not None or (token.expires_at and token.expires_at <= now):
        raise ApiException(404, "QR_TOKEN_INVALID", "Token tidak valid atau kedaluwarsa.")
    location = db.get(Location, token.location_id)
    if location is None:
        raise ApiException(404, "QR_TOKEN_INVALID", "Rute untuk token tidak tersedia.")

    spatial_map = db.scalar(
        select(SpatialMap)
        .join(SpatialScan, SpatialScan.scan_id == SpatialMap.scan_id)
        .where(SpatialScan.location_id == location.id)
        .order_by(desc(SpatialMap.created_at))
        .limit(1)
    )
    hazard_points: list[Coordinate3D] = []
    safe_zones: list[Coordinate3D] = []
    if spatial_map:
        hazard_points = [
            SpatialObject.model_validate(item).position for item in json.loads(spatial_map.hazard_zones_json)
        ]
        safe_zones = [
            SpatialObject.model_validate(item).position for item in json.loads(spatial_map.safe_zones_json)
        ]
    return GuestRouteResponse(
        location_ref=location.location_ref,
        origin=Coordinate3D.model_validate(json.loads(location.origin_json)),
        route_points=[Coordinate3D.model_validate(item) for item in json.loads(location.route_points_json)],
        hazard_points=hazard_points,
        safe_zones=safe_zones,
        exit_point=Coordinate3D.model_validate(json.loads(location.exit_point_json)),
    )
