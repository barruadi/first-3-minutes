import io
from urllib.parse import urlparse

from PIL import Image

from app.fixtures.seed import seed
from app.models import Building, Drill, QrToken


def jpeg_bytes(color="white") -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (16, 16), color).save(buffer, "JPEG")
    return buffer.getvalue()


def upload_scan(client, scan_id="scan-api-001", installation_id="resident-api-001"):
    image = jpeg_bytes()
    files = [("images", (f"frame-{i}.jpg", image, "image/jpeg")) for i in range(15)]
    return client.post(
        "/api/scans/spatial-map",
        data={"scanId": scan_id, "installationId": installation_id, "locationId": "loc-demo-001"},
        files=files,
    )


def test_spatial_upload_persists_and_is_idempotent(client):
    first = upload_scan(client)
    assert first.status_code == 200, first.text
    assert first.json()["source"] == "fallback"
    second = upload_scan(client)
    assert second.status_code == 200
    assert second.json()["createdAt"] == first.json()["createdAt"]


def test_spatial_upload_rejects_bad_count_and_content(client):
    image = jpeg_bytes()
    response = client.post(
        "/api/scans/spatial-map",
        data={"scanId": "bad-count", "installationId": "device"},
        files=[("images", ("frame.jpg", image, "image/jpeg"))],
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "SCAN_FRAME_COUNT_INVALID"

    files = [("images", (f"frame-{i}.jpg", b"not-an-image", "image/jpeg")) for i in range(15)]
    response = client.post(
        "/api/scans/spatial-map",
        data={"scanId": "bad-image", "installationId": "device"},
        files=files,
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "SCAN_IMAGE_INVALID"


def test_drill_completion_updates_reads_and_prevents_double_reward(client):
    assert upload_scan(client, "scan-drill-api", "fresh-device").status_code == 200
    body = {
        "scanId": "scan-drill-api",
        "reactionTimeMs": 6000,
        "evacuationTimeMs": 50000,
        "postureScorePercentage": 95,
        "completedAtDevice": "2026-07-16T08:00:00Z",
    }
    first = client.post("/api/drills/drill-api-001/complete", json=body)
    assert first.status_code == 200, first.text
    assert first.json()["rewardEligible"] is True
    repeated = client.post("/api/drills/drill-api-001/complete", json=body)
    assert repeated.status_code == 200
    assert repeated.json() == first.json()

    home = client.get("/api/resident/home?installationId=fresh-device")
    assert home.status_code == 200
    assert home.json()["safetyRating"]["score"] == first.json()["safetyRating"]
    rewards = client.get("/api/resident/rewards?installationId=fresh-device")
    assert len(rewards.json()["records"]) == 1
    history = client.get("/api/resident/history?installationId=fresh-device&limit=1")
    assert history.json()["items"][0]["drillId"] == "drill-api-001"


def test_admin_scope_location_floorplan_qr_and_guest(client):
    analytics = client.get("/api/admin/analytics?buildingId=attacker-building")
    assert analytics.status_code == 200
    assert analytics.json()["buildingId"] == "building-demo-001"

    png = io.BytesIO()
    Image.new("RGB", (32, 32), "navy").save(png, "PNG")
    floor = client.post(
        "/api/admin/floor-plans",
        data={"name": "Emergency Floor"},
        files={"file": ("floor.png", png.getvalue(), "image/png")},
    )
    assert floor.status_code == 201, floor.text
    floor_id = floor.json()["id"]
    assert client.get(f"/api/admin/floor-plans/{floor_id}/file").status_code == 200

    location = client.post("/api/admin/locations", json={
        "buildingId": "attacker-building",
        "floorPlanId": floor_id,
        "locationRef": "floor-api-room-1",
        "label": "API Room",
        "origin": {"x": 0, "y": 0, "z": 0},
        "routePoints": [{"x": 0, "y": 0, "z": -1}],
        "exitPoint": {"x": 0, "y": 0, "z": -3},
    })
    assert location.status_code == 201, location.text
    assert location.json()["buildingId"] == "building-demo-001"

    provision = client.post(f"/api/admin/locations/{location.json()['id']}/rescue-qr")
    assert provision.status_code == 201, provision.text
    payload = provision.json()
    assert client.get(payload["qrSvgUrl"]).headers["content-type"].startswith("image/svg+xml")
    assert client.get(payload["qrPngUrl"]).headers["content-type"].startswith("image/png")
    token = urlparse(payload["guestUrl"]).path.rsplit("/", 1)[-1]
    guest = client.get(f"/api/guest/rescue/{token}")
    assert guest.status_code == 200
    assert guest.json()["locationRef"] == "floor-api-room-1"
    assert client.get(f"/api/guest/rescue/{token}tampered").status_code == 404


def test_compliance_pdf_is_generated_and_downloadable(client):
    response = client.post("/api/admin/compliance-reports", json={
        "buildingId": "attacker-building",
        "periodFrom": "2026-07-01T00:00:00Z",
        "periodTo": "2026-07-15T00:00:00Z",
    })
    assert response.status_code == 201, response.text
    report_id = response.json()["reportId"]
    status = client.get(f"/api/admin/compliance-reports/{report_id}")
    assert status.json()["status"] == "ready"
    pdf = client.get(f"/api/admin/compliance-reports/{report_id}/download")
    assert pdf.status_code == 200
    assert pdf.headers["content-type"].startswith("application/pdf")
    assert pdf.content.startswith(b"%PDF")


def test_demo_seed_is_idempotent(db):
    seed(db)
    assert db.query(Building).count() == 1
    assert db.query(Drill).filter_by(id="drill-demo-001").count() == 1
    assert db.query(QrToken).filter_by(location_id="loc-demo-001").count() == 1
