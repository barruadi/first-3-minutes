def test_root_health(client):
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"


def test_api_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200


def test_resident_home_returns_200(client):
    res = client.get("/api/resident/home?installationId=resident-demo-001")
    assert res.status_code == 200
    data = res.json()
    assert "safetyRating" in data
    assert "rewardEligibility" in data


def test_admin_analytics_returns_200(client):
    res = client.get("/api/admin/analytics")
    assert res.status_code == 200
    data = res.json()
    assert "buildingId" in data
    assert data["buildingId"] == "building-demo-001"


def test_guest_route_valid_demo_token(client):
    res = client.get("/api/guest/rescue/demo-token-loc-demo-001")
    assert res.status_code == 200
    data = res.json()
    assert "locationRef" in data


def test_seeded_evacuation_room_has_mesh_route_and_qr(client, db):
    route = client.get("/api/guest/rescue/demo-evacuation-room-001")
    assert route.status_code == 200
    data = route.json()
    assert data["locationRef"] == "demo-evacuation-room"
    assert len(data["routePoints"]) == 4
    assert data["hazardPoints"] == [{"x": 0.0, "y": 0.0, "z": -1.2}]
    assert data["exitPoint"] == {"x": 0.8, "y": 0.0, "z": 2.1}

    scans = client.get("/api/buildings/scans")
    assert scans.status_code == 200
    room = next(item for item in scans.json() if item["id"] == "evacuation-room-demo-001")
    assert room["floorPlanUrl"].endswith("/uploads/floor_plans/evacuation-room-demo-001.png")
    assert room["meshUrl"].endswith("/uploads/meshes/evacuation-room-demo-001.obj")

    qr_png = client.get("/api/admin/qr/qr-evacuation-room-demo-001.png")
    assert qr_png.status_code == 200
    assert qr_png.headers["content-type"] == "image/png"


def test_guest_route_invalid_token(client):
    res = client.get("/api/guest/rescue/completely-invalid-xyz")
    assert res.status_code == 404


def test_admin_locations_returns_200(client):
    res = client.get("/api/admin/locations")
    assert res.status_code == 200
