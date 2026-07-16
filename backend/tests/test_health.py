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


def test_guest_route_invalid_token(client):
    res = client.get("/api/guest/rescue/completely-invalid-xyz")
    assert res.status_code == 404


def test_admin_locations_returns_200(client):
    res = client.get("/api/admin/locations")
    assert res.status_code == 200
