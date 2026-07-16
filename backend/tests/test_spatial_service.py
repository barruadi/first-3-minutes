import asyncio
import io
import json

import pytest
from fastapi import UploadFile
from PIL import Image

from app.core.config import settings
from app.core.errors import ApiException
from app.services.spatial_ai import (
    SpatialAIService,
    build_fallback,
    extract_spatial_json,
)


def test_extracts_fenced_spatial_json():
    payload = {
        "origin": {"x": 0, "y": 0, "z": 0},
        "safeZones": [{
            "id": "safe-1", "type": "SAFE_ZONE", "label": "table<script>",
            "position": {"x": 1, "y": 0, "z": -1}, "confidence": 0.8,
        }],
        "hazardZones": [],
        "exitPoints": [{
            "id": "exit-1", "type": "EXIT_POINT", "label": "door",
            "position": {"x": 0, "y": 0, "z": -3}, "confidence": 0.9,
        }],
    }
    result = extract_spatial_json(f"```json\n{json.dumps(payload)}\n```", "scan-1")
    assert result.source == "gemini"
    assert result.safe_zones[0].label == "tablescript"


def test_invalid_map_without_exit_is_rejected():
    with pytest.raises(ValueError):
        extract_spatial_json(json.dumps({
            "origin": {"x": 0, "y": 0, "z": 0},
            "safeZones": [{
                "id": "safe", "type": "SAFE_ZONE", "label": "table",
                "position": {"x": 0, "y": 0, "z": 0},
            }],
            "hazardZones": [], "exitPoints": [],
        }), "scan-1")


def test_fallback_has_required_elements():
    result = build_fallback("scan-1")
    assert result.source == "fallback"
    assert result.safe_zones and result.exit_points


class SlowClient:
    async def generate(self, images):
        await asyncio.sleep(0.1)
        return "{}"


@pytest.mark.asyncio
async def test_ai_timeout_is_504(db, monkeypatch):
    image = Image.new("RGB", (8, 8), "white")
    buffer = io.BytesIO()
    image.save(buffer, "JPEG")
    uploads = [UploadFile(filename=f"{i}.jpg", file=io.BytesIO(buffer.getvalue()), headers={"content-type": "image/jpeg"}) for i in range(15)]
    monkeypatch.setattr(settings, "gemini_api_key", "test-key")
    monkeypatch.setattr(settings, "spatial_ai_timeout_seconds", 0.01)
    service = SpatialAIService(client=SlowClient())
    with pytest.raises(ApiException) as exc:
        await service.process_scan(db, "timeout-scan", "timeout-device", "loc-demo-001", uploads)
    assert exc.value.status_code == 504
    assert exc.value.code == "SPATIAL_AI_TIMEOUT"
