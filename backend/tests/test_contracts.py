"""Backend contract tests against the shared JSON fixtures."""
import json
from pathlib import Path
import pytest
from app.schemas.spatial import SpatialMapResponse
from app.schemas.drill import DrillMetricsRequest
from app.schemas.guest import GuestRouteResponse
from app.schemas.admin import AnalyticsSummaryResponse

FIXTURES_DIR = Path(__file__).resolve().parents[2] / "frontend" / "packages" / "contracts" / "fixtures"


def load(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text())


def test_spatial_map_valid_fixture():
    data = load("spatial-map.valid.json")
    # map camelCase to snake_case for Pydantic model_validate
    result = SpatialMapResponse.model_validate(data)
    assert result.scan_id == "scan-demo-001"
    assert result.source == "gemini"
    assert len(result.safe_zones) == 1


def test_drill_metrics_valid_fixture():
    data = load("drill-metrics.valid.json")
    result = DrillMetricsRequest.model_validate(data)
    assert result.scan_id == "scan-demo-001"
    assert result.reaction_time_ms == 8420


def test_guest_route_valid_fixture():
    data = load("guest-route.valid.json")
    result = GuestRouteResponse.model_validate(data)
    assert result.location_ref == "floor-4-room-402"


def test_analytics_valid_fixture():
    data = load("analytics-summary.valid.json")
    result = AnalyticsSummaryResponse.model_validate(data)
    assert result.building_id == "building-demo-001"
    assert result.participation_rate_percentage == 85.0
