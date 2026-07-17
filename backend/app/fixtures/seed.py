"""
Idempotent demo seed.
Run: python -m app.fixtures.seed
"""
import sys
from datetime import datetime
import hashlib
import io
import json
from pathlib import Path
import shutil

import qrcode
import qrcode.image.svg

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.database import Base, engine
from app.models import (
    Organization, Building, FloorPlan, Location,
    DeviceProfile, SpatialScan, SpatialMap,
    Drill, DrillMetrics, RewardIssuance, QrToken, BuildingScan,
)
from app.core.config import settings
from app.services.storage import storage_path
from app.services.floor_plan_renderer import render_obj_floor_plan

DEMO = {
    "org_id": "org-demo-001",
    "building_id": "building-demo-001",
    "floorplan_id": "floorplan-demo-001",
    "location_id": "loc-demo-001",
    "resident_id": "resident-demo-001",
    "admin_id": "admin-demo-001",
    "scan_id": "scan-demo-001",
    "drill_id": "drill-demo-001",
    "qr_token_id": "qr-token-demo-001",
    "qr_raw_token": "demo-token-loc-demo-001",
    "evacuation_room_id": "evacuation-room-demo-001",
    "evacuation_location_id": "loc-evacuation-room-demo-001",
    "evacuation_scan_id": "scan-evacuation-room-demo-001",
    "evacuation_map_id": "spatial-map-evacuation-room-demo-001",
    "evacuation_qr_id": "qr-evacuation-room-demo-001",
    "evacuation_qr_raw_token": "demo-evacuation-room-001",
}

FIXTURE_ASSETS = Path(__file__).resolve().parent / "assets"


def _seed_evacuation_assets() -> tuple[Path, Path, str, float, float, float]:
    """Copy the demo mesh and create a stable, immediately scannable QR."""
    mesh_path = storage_path("meshes", f"{DEMO['evacuation_room_id']}.obj")
    shutil.copyfile(FIXTURE_ASSETS / "evacuation-room.obj", mesh_path)
    floor_plan_path = storage_path("floor_plans", f"{DEMO['evacuation_room_id']}.png")
    floor_metadata = render_obj_floor_plan(mesh_path, floor_plan_path)

    guest_url = (
        f"{settings.guest_base_url.rstrip('/')}/rescue/"
        f"{DEMO['evacuation_qr_raw_token']}"
    )
    svg_buffer = io.BytesIO()
    qrcode.make(
        guest_url,
        image_factory=qrcode.image.svg.SvgPathImage,
        border=4,
    ).save(svg_buffer)
    storage_path("qr", f"{DEMO['evacuation_qr_id']}.svg").write_bytes(svg_buffer.getvalue())

    png_buffer = io.BytesIO()
    qrcode.make(
        guest_url,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        border=4,
        box_size=16,
    ).save(png_buffer, format="PNG")
    storage_path("qr", f"{DEMO['evacuation_qr_id']}.png").write_bytes(png_buffer.getvalue())
    return (
        mesh_path,
        floor_plan_path,
        guest_url,
        floor_metadata.scale_meters_per_pixel,
        floor_metadata.origin_x,
        floor_metadata.origin_z,
    )


def seed(db: Session) -> None:
    (
        demo_mesh_path,
        demo_floor_plan_path,
        demo_guest_url,
        demo_scale,
        demo_origin_x,
        demo_origin_z,
    ) = _seed_evacuation_assets()

    # Organization
    if not db.get(Organization, DEMO["org_id"]):
        db.add(Organization(id=DEMO["org_id"], name="Demo Organization"))
    db.flush()

    # Building
    if not db.get(Building, DEMO["building_id"]):
        db.add(Building(id=DEMO["building_id"], organization_id=DEMO["org_id"], name="Demo Building", status="active"))
    db.flush()

    # Floor plan
    if not db.get(FloorPlan, DEMO["floorplan_id"]):
        db.add(FloorPlan(id=DEMO["floorplan_id"], building_id=DEMO["building_id"], name="Lantai 4"))
    db.flush()

    # Location
    if not db.get(Location, DEMO["location_id"]):
        db.add(Location(
            id=DEMO["location_id"],
            building_id=DEMO["building_id"],
            floor_plan_id=DEMO["floorplan_id"],
            location_ref="floor-4-room-402",
            label="Lantai 4 Ruang 402",
            origin_json=json.dumps({"x": 0, "y": 0, "z": 0}),
            route_points_json=json.dumps([{"x": 0, "y": 0, "z": -1.5}, {"x": 1.2, "y": 0, "z": -3.0}]),
            exit_point_json=json.dumps({"x": 2.1, "y": 0, "z": -5.0}),
        ))
    db.flush()

    # Device profiles (resident + admin demo)
    for inst_id in [DEMO["resident_id"], DEMO["admin_id"]]:
        if not db.get(DeviceProfile, inst_id):
            db.add(DeviceProfile(
                installation_id=inst_id,
                safety_rating=75.0,
                tier="Gold",
                last_drill_at=datetime(2026, 7, 16) if inst_id == DEMO["resident_id"] else None,
            ))

    # Spatial scan
    if not db.get(SpatialScan, DEMO["scan_id"]):
        db.add(SpatialScan(
            id=DEMO["scan_id"],
            scan_id=DEMO["scan_id"],
            installation_id=DEMO["resident_id"],
            building_id=DEMO["building_id"],
            location_id=DEMO["location_id"],
            status="completed",
            frame_count=15,
            payload_bytes=1024 * 512,
            completed_at=datetime(2026, 7, 16),
        ))
    db.flush()

    # Spatial map for demo scan
    existing_map = db.query(SpatialMap).filter_by(scan_id=DEMO["scan_id"]).first()
    if not existing_map:
        db.add(SpatialMap(
            id="spatial-map-demo-001",
            scan_id=DEMO["scan_id"],
            origin_json=json.dumps({"x": 0, "y": 0, "z": 0}),
            safe_zones_json=json.dumps([{"id": "safe-1", "type": "SAFE_ZONE", "label": "sturdy_table", "position": {"x": 1.2, "y": 0, "z": -2.4}, "confidence": 0.91}]),
            hazard_zones_json=json.dumps([{"id": "hazard-1", "type": "HAZARD_ZONE", "label": "tall_cabinet", "position": {"x": -1.5, "y": 0, "z": -1.0}}]),
            exit_points_json=json.dumps([{"id": "exit-1", "type": "EXIT_POINT", "label": "main_door", "position": {"x": 2.1, "y": 0, "z": -5.0}}]),
            source="fallback",
        ))

    # Demo drill
    if not db.get(Drill, DEMO["drill_id"]):
        db.add(Drill(
            id=DEMO["drill_id"],
            installation_id=DEMO["resident_id"],
            scan_id=DEMO["scan_id"],
            building_id=DEMO["building_id"],
            reaction_time_ms=8420,
            evacuation_time_ms=61240,
            posture_score_percentage=91.0,
            accepted=True,
            reward_eligible=True,
            safety_rating_after=75.0,
            tier_after="Gold",
            created_at=datetime(2026, 7, 16),
        ))
    db.flush()

    if not db.query(DrillMetrics).filter_by(drill_id=DEMO["drill_id"]).first():
        db.add(DrillMetrics(
            id="drill-metrics-demo-001",
            drill_id=DEMO["drill_id"],
            reaction_time_ms=8420,
            evacuation_time_ms=61240,
            posture_score_percentage=91.0,
            completed_at_device=datetime(2026, 7, 16),
            received_at=datetime(2026, 7, 16),
        ))

    if not db.query(RewardIssuance).filter_by(drill_id=DEMO["drill_id"]).first():
        db.add(RewardIssuance(
            id="reward-demo-001",
            installation_id=DEMO["resident_id"],
            drill_id=DEMO["drill_id"],
            cycle_started_at=datetime(2026, 7, 16),
            issued_at=datetime(2026, 7, 16),
        ))

    # QR token
    qr_hash = hashlib.sha256(
        f"{settings.qr_token_secret}:{DEMO['qr_raw_token']}".encode("utf-8")
    ).hexdigest()
    existing_qr = db.query(QrToken).filter_by(token_hash=qr_hash).first()
    if not existing_qr:
        db.add(QrToken(
            id=DEMO["qr_token_id"],
            token_hash=qr_hash,
            location_id=DEMO["location_id"],
        ))

    # Standalone AR evacuation example. The route starts near the room's desk,
    # bends around the cabinet hazard, and ends at the doorway in the +Z wall.
    evacuation_room = db.get(BuildingScan, DEMO["evacuation_room_id"])
    if evacuation_room is None:
        evacuation_room = BuildingScan(
            id=DEMO["evacuation_room_id"],
            installation_id=DEMO["resident_id"],
            created_at=datetime(2026, 7, 17),
        )
        db.add(evacuation_room)
    # Refresh generated paths and projection metadata on every idempotent run.
    evacuation_room.floor_plan_path = str(demo_floor_plan_path)
    evacuation_room.mesh_path = str(demo_mesh_path)
    evacuation_room.scale_meters_per_pixel = demo_scale
    evacuation_room.origin_x = demo_origin_x
    evacuation_room.origin_z = demo_origin_z

    if not db.get(Location, DEMO["evacuation_location_id"]):
        db.add(Location(
            id=DEMO["evacuation_location_id"],
            building_id=DEMO["building_id"],
            floor_plan_id=None,
            location_ref="demo-evacuation-room",
            label="Ruang Demo Evakuasi AR",
            origin_json=json.dumps({"x": -1.8, "y": 0.0, "z": -0.8}),
            route_points_json=json.dumps([
                {"x": -0.8, "y": 0.0, "z": -0.8},
                {"x": 0.2, "y": 0.0, "z": -0.2},
                {"x": 0.8, "y": 0.0, "z": 0.8},
                {"x": 0.8, "y": 0.0, "z": 1.6},
            ]),
            exit_point_json=json.dumps({"x": 0.8, "y": 0.0, "z": 2.1}),
        ))
    db.flush()

    if not db.get(SpatialScan, DEMO["evacuation_scan_id"]):
        db.add(SpatialScan(
            id=DEMO["evacuation_scan_id"],
            scan_id=DEMO["evacuation_scan_id"],
            installation_id=DEMO["resident_id"],
            building_id=DEMO["building_id"],
            location_id=DEMO["evacuation_location_id"],
            status="completed",
            frame_count=15,
            payload_bytes=0,
            completed_at=datetime(2026, 7, 17),
        ))
    db.flush()

    if not db.get(SpatialMap, DEMO["evacuation_map_id"]):
        db.add(SpatialMap(
            id=DEMO["evacuation_map_id"],
            scan_id=DEMO["evacuation_scan_id"],
            origin_json=json.dumps({"x": -1.8, "y": 0.0, "z": -0.8}),
            safe_zones_json=json.dumps([{
                "id": "safe-demo-desk",
                "type": "SAFE_ZONE",
                "label": "sturdy_desk",
                "position": {"x": -1.8, "y": 0.0, "z": -0.8},
                "confidence": 1.0,
            }]),
            hazard_zones_json=json.dumps([{
                "id": "hazard-demo-cabinet",
                "type": "HAZARD_ZONE",
                "label": "tall_cabinet",
                "position": {"x": 0.0, "y": 0.0, "z": -1.2},
                "confidence": 1.0,
            }]),
            exit_points_json=json.dumps([{
                "id": "exit-demo-door",
                "type": "EXIT_POINT",
                "label": "emergency_exit",
                "position": {"x": 0.8, "y": 0.0, "z": 2.1},
                "confidence": 1.0,
            }]),
            source="fallback",
        ))

    evacuation_qr_hash = hashlib.sha256(
        f"{settings.qr_token_secret}:{DEMO['evacuation_qr_raw_token']}".encode("utf-8")
    ).hexdigest()
    if not db.query(QrToken).filter_by(token_hash=evacuation_qr_hash).first():
        db.add(QrToken(
            id=DEMO["evacuation_qr_id"],
            token_hash=evacuation_qr_hash,
            location_id=DEMO["evacuation_location_id"],
        ))

    db.commit()
    print(f"Seed completed successfully. Demo evacuation QR: {demo_guest_url}")


if __name__ == "__main__":
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)
