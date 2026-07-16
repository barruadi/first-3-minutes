from datetime import datetime, timedelta

import pytest

from app.models import DeviceProfile
from app.schemas.drill import DrillMetricsRequest
from app.services.rating import apply_decay, calculate_rating, reward_is_available, tier_for_score


def metrics(reaction: int, evacuation: int, posture: float) -> DrillMetricsRequest:
    return DrillMetricsRequest(
        scanId="scan-test",
        reactionTimeMs=reaction,
        evacuationTimeMs=evacuation,
        postureScorePercentage=posture,
        completedAtDevice="2026-07-16T08:00:00Z",
    )


def test_rating_boundaries():
    assert calculate_rating(metrics(5_000, 45_000, 100)) == 100
    assert calculate_rating(metrics(30_000, 180_000, 0)) == 0
    assert tier_for_score(85) == "Platinum"
    assert tier_for_score(70) == "Gold"
    assert tier_for_score(69.99) == "Silver"


def test_reward_rolling_window_boundary():
    now = datetime(2026, 7, 16, 12)
    assert reward_is_available(None, now)
    assert not reward_is_available(now - timedelta(days=6, hours=23), now)
    assert reward_is_available(now - timedelta(days=7), now)


def test_decay_is_idempotent_for_processed_week():
    now = datetime(2026, 7, 16, 12)
    profile = DeviceProfile(
        installation_id="decay-test",
        safety_rating=100,
        tier="Platinum",
        last_drill_at=now - timedelta(days=31),
    )
    assert apply_decay(profile, now) == 1
    assert profile.safety_rating == 95
    assert apply_decay(profile, now) == 0
    assert profile.safety_rating == 95
