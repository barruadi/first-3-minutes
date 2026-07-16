"""Backend contract tests terhadap fixture JSON bersama.

Producer dan consumer WAJIB memvalidasi fixture yang sama. Setiap penambahan
fixture pada frontend/packages/contracts/fixtures/ harus punya test di sini
dan di contracts.test.ts.
"""
import json
from pathlib import Path
import pytest
from pydantic import ValidationError

from app.schemas.spatial import SpatialMapResponse
from app.schemas.drill import DrillMetricsRequest, DrillCompletionResponse
from app.schemas.guest import GuestRouteResponse
from app.schemas.admin import AnalyticsSummaryResponse, ComplianceReportRequest
from app.schemas.resident import ResidentHomeResponse
from app.schemas.common import ApiError, ERROR_HTTP_STATUS

# parents[1] = backend/, parents[2] = repo root.
# Sebelum freeze v1 ini bernilai parents[3] dan menunjuk KELUAR dari repository,
# sehingga seluruh test di file ini gagal dengan FileNotFoundError.
FIXTURES_DIR = Path(__file__).resolve().parents[2] / "frontend" / "packages" / "contracts" / "fixtures"


def load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_fixtures_dir_resolves_inside_repository():
    assert FIXTURES_DIR.is_dir(), f"Fixture dir tidak ditemukan: {FIXTURES_DIR}"


# --- SpatialMap ---

def test_spatial_map_valid_fixture():
    result = SpatialMapResponse.model_validate(load("spatial-map.valid.json"))
    assert result.scan_id == "scan-demo-001"
    assert result.source == "gemini"
    assert len(result.safe_zones) == 1


def test_spatial_map_fallback_fixture():
    result = SpatialMapResponse.model_validate(load("spatial-map.fallback.json"))
    assert result.source == "fallback"
    # Fallback tetap wajib memenuhi minimum agar drill dapat berjalan.
    assert result.safe_zones and result.exit_points


def test_spatial_map_invalid_fixture_rejected():
    with pytest.raises(ValidationError):
        SpatialMapResponse.model_validate(load("spatial-map.invalid.json"))


def test_spatial_map_without_safe_zone_rejected():
    with pytest.raises(ValidationError):
        SpatialMapResponse.model_validate(load("spatial-map.no-safe-zone.invalid.json"))


def test_spatial_map_rejects_unknown_source():
    data = load("spatial-map.valid.json") | {"source": "chatgpt"}
    with pytest.raises(ValidationError):
        SpatialMapResponse.model_validate(data)


def test_spatial_map_rejects_unknown_object_type():
    data = load("spatial-map.valid.json")
    data["safeZones"][0]["type"] = "COFFEE_ZONE"
    with pytest.raises(ValidationError):
        SpatialMapResponse.model_validate(data)


# --- Drill ---

def test_drill_metrics_valid_fixture():
    result = DrillMetricsRequest.model_validate(load("drill-metrics.valid.json"))
    assert result.scan_id == "scan-demo-001"
    assert result.reaction_time_ms == 8420


def test_drill_metrics_invalid_fixture_rejected():
    with pytest.raises(ValidationError):
        DrillMetricsRequest.model_validate(load("drill-metrics.invalid.json"))


def test_drill_result_eligible_fixture():
    result = DrillCompletionResponse.model_validate(load("drill-result.eligible.json"))
    assert result.reward_eligible is True
    assert result.tier == "Platinum"


def test_drill_result_not_eligible_fixture():
    result = DrillCompletionResponse.model_validate(load("drill-result.not-eligible.json"))
    assert result.reward_eligible is False
    assert result.tier == "Gold"


def test_drill_result_rejects_tier_outside_frozen_enum():
    data = load("drill-result.eligible.json") | {"tier": "Bronze"}
    with pytest.raises(ValidationError):
        DrillCompletionResponse.model_validate(data)


# --- Resident ---

def test_resident_home_valid_fixture():
    result = ResidentHomeResponse.model_validate(load("resident-home.valid.json"))
    assert result.last_drill is not None
    assert result.spatial_readiness.has_spatial_map is True
    assert result.safety_rating.tier == "Platinum"


def test_resident_home_accepts_first_run_resident():
    result = ResidentHomeResponse.model_validate(
        {
            "installationId": "resident-demo-002",
            "safetyRating": {"score": 0, "tier": "Silver", "lastDrillAt": None},
            "rewardEligibility": {"eligible": True, "nextEligibleAt": None, "lastIssuedAt": None},
            "locationStatus": None,
            "lastDrill": None,
            "spatialReadiness": {"hasSpatialMap": False, "scanId": None, "source": None, "createdAt": None},
        }
    )
    assert result.last_drill is None


def test_resident_home_serializes_to_camel_case():
    """HTTP interface WAJIB camelCase (environment.md §13)."""
    result = ResidentHomeResponse.model_validate(load("resident-home.valid.json"))
    dumped = result.model_dump(by_alias=True)
    assert "installationId" in dumped
    assert "spatialReadiness" in dumped
    assert "installation_id" not in dumped


# --- Guest ---

def test_guest_route_valid_fixture():
    result = GuestRouteResponse.model_validate(load("guest-route.valid.json"))
    assert result.location_ref == "floor-4-room-402"


# --- Admin ---

def test_analytics_valid_fixture():
    result = AnalyticsSummaryResponse.model_validate(load("analytics-summary.valid.json"))
    assert result.building_id == "building-demo-001"
    assert result.participation_rate_percentage == 85.0
    assert result.escape_route_trends[0].period == "2026-W29"


def test_analytics_rejects_non_iso_week_period():
    data = load("analytics-summary.valid.json")
    data["escapeRouteTrends"] = [{"period": "July", "averageEvacuationTimeMs": 1000}]
    with pytest.raises(ValidationError):
        AnalyticsSummaryResponse.model_validate(data)


def test_compliance_request_valid_fixture():
    result = ComplianceReportRequest.model_validate(load("compliance-report-request.valid.json"))
    assert result.period_from < result.period_to


def test_compliance_request_ignores_client_building_scope():
    """architecture.md §10.6/§11: server selalu memakai DEMO_BUILDING_ID."""
    result = ComplianceReportRequest.model_validate(
        {
            "buildingId": "building-attacker-001",
            "periodFrom": "2026-07-01T00:00:00Z",
            "periodTo": "2026-07-16T00:00:00Z",
        }
    )
    assert not hasattr(result, "building_id")


# --- Error envelope ---

@pytest.mark.parametrize(
    "fixture,expected_code",
    [
        ("error.timeout.json", "SPATIAL_AI_TIMEOUT"),
        ("error.invalid-token.json", "QR_TOKEN_INVALID"),
    ],
)
def test_error_fixtures(fixture: str, expected_code: str):
    result = ApiError.model_validate(load(fixture))
    assert result.error.code == expected_code
    assert result.error.details is None


def test_error_http_mapping_is_frozen():
    assert ERROR_HTTP_STATUS["SPATIAL_AI_TIMEOUT"] == 504
    assert ERROR_HTTP_STATUS["QR_TOKEN_INVALID"] == 404
