import uuid
from datetime import datetime, timedelta

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import ApiException
from app.core.time import utc_now
from app.models import DeviceProfile, Drill, DrillMetrics, RewardIssuance, SpatialScan
from app.schemas.drill import DrillCompletionResponse, DrillMetricsRequest


def _lower_is_better(value: int, excellent: int, maximum: int) -> float:
    if value <= excellent:
        return 100.0
    if value >= maximum:
        return 0.0
    return 100.0 * (maximum - value) / (maximum - excellent)


def calculate_rating(metrics: DrillMetricsRequest) -> float:
    reaction = _lower_is_better(
        metrics.reaction_time_ms,
        settings.rating_reaction_excellent_ms,
        settings.rating_reaction_max_ms,
    )
    evacuation = _lower_is_better(
        metrics.evacuation_time_ms,
        settings.rating_evacuation_excellent_ms,
        settings.rating_evacuation_max_ms,
    )
    weights = (
        settings.rating_reaction_weight,
        settings.rating_evacuation_weight,
        settings.rating_posture_weight,
    )
    total_weight = sum(weights)
    if total_weight <= 0:
        raise RuntimeError("Rating weights must have a positive sum")
    score = (
        reaction * weights[0]
        + evacuation * weights[1]
        + metrics.posture_score_percentage * weights[2]
    ) / total_weight
    return round(max(0.0, min(100.0, score)), 2)


def tier_for_score(score: float) -> str:
    if score >= settings.rating_platinum_threshold:
        return "Platinum"
    if score >= settings.rating_gold_threshold:
        return "Gold"
    return "Silver"


def apply_decay(profile: DeviceProfile, now: datetime | None = None) -> int:
    now = now or utc_now()
    if profile.last_drill_at is None:
        return 0
    decay_start = profile.last_drill_at + timedelta(days=settings.rating_decay_grace_days)
    if now <= decay_start:
        return 0
    total_due = int((now - decay_start).total_seconds() // timedelta(days=7).total_seconds()) + 1
    already_applied = profile.last_decay_week or 0
    weeks = max(0, total_due - already_applied)
    if weeks:
        profile.safety_rating = round(
            max(0.0, profile.safety_rating * ((1.0 - settings.rating_decay_weekly_rate) ** weeks)),
            2,
        )
        profile.tier = tier_for_score(profile.safety_rating)
        # This marker stores how many decay cycles have been processed for the
        # current inactivity period. It is reset after a completed drill.
        profile.last_decay_week = total_due
    return weeks


def reward_is_available(latest_issued_at: datetime | None, now: datetime | None = None) -> bool:
    now = now or utc_now()
    return latest_issued_at is None or now - latest_issued_at >= timedelta(days=settings.reward_window_days)


def complete_drill(
    db: Session,
    drill_id: str,
    metrics: DrillMetricsRequest,
    now: datetime | None = None,
) -> DrillCompletionResponse:
    now = now or utc_now()
    drill_id = drill_id.strip()
    if not drill_id or len(drill_id) > 128:
        raise ApiException(422, "DRILL_METRICS_INVALID", "drillId tidak valid.")

    existing = db.get(Drill, drill_id)
    if existing:
        if existing.scan_id != metrics.scan_id:
            raise ApiException(409, "DRILL_CONFLICT", "drillId sudah digunakan untuk scan lain.")
        return DrillCompletionResponse(
            drill_id=existing.id,
            accepted=existing.accepted,
            reward_eligible=existing.reward_eligible,
            safety_rating=existing.safety_rating_after,
            tier=existing.tier_after,
            recorded_at=existing.created_at,
        )

    scan = db.scalar(select(SpatialScan).where(SpatialScan.scan_id == metrics.scan_id))
    if scan is None or scan.status not in {"completed", "fallback"}:
        raise ApiException(404, "SCAN_NOT_FOUND", "Scan spasial siap pakai tidak ditemukan.")

    try:
        profile = db.scalar(
            select(DeviceProfile)
            .where(DeviceProfile.installation_id == scan.installation_id)
            .with_for_update()
        )
        if profile is None:
            profile = DeviceProfile(installation_id=scan.installation_id, safety_rating=0.0, tier="Silver")
            db.add(profile)
            db.flush()
        apply_decay(profile, now)

        latest_reward = db.scalar(
            select(RewardIssuance)
            .where(RewardIssuance.installation_id == scan.installation_id)
            .order_by(desc(RewardIssuance.issued_at))
            .limit(1)
        )
        eligible = reward_is_available(latest_reward.issued_at if latest_reward else None, now)
        score = calculate_rating(metrics)
        tier = tier_for_score(score)

        drill = Drill(
            id=drill_id,
            installation_id=scan.installation_id,
            scan_id=scan.scan_id,
            building_id=scan.building_id,
            reaction_time_ms=metrics.reaction_time_ms,
            evacuation_time_ms=metrics.evacuation_time_ms,
            posture_score_percentage=metrics.posture_score_percentage,
            accepted=True,
            reward_eligible=eligible,
            safety_rating_after=score,
            tier_after=tier,
            created_at=now,
        )
        db.add(drill)
        db.add(
            DrillMetrics(
                id=str(uuid.uuid4()),
                drill_id=drill_id,
                reaction_time_ms=metrics.reaction_time_ms,
                evacuation_time_ms=metrics.evacuation_time_ms,
                posture_score_percentage=metrics.posture_score_percentage,
                completed_at_device=metrics.completed_at_device.replace(tzinfo=None),
                received_at=now,
            )
        )
        profile.safety_rating = score
        profile.tier = tier
        profile.last_drill_at = now
        profile.last_decay_week = None

        if eligible:
            db.add(
                RewardIssuance(
                    id=str(uuid.uuid4()),
                    installation_id=scan.installation_id,
                    drill_id=drill_id,
                    cycle_started_at=now,
                    issued_at=now,
                )
            )
        db.commit()
    except ApiException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise

    return DrillCompletionResponse(
        drill_id=drill_id,
        accepted=True,
        reward_eligible=eligible,
        safety_rating=score,
        tier=tier,
        recorded_at=now,
    )
