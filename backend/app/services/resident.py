import base64
import json
from datetime import datetime, timedelta

from sqlalchemy import and_, desc, or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import ApiException
from app.core.time import utc_now
from app.models import DeviceProfile, Drill, RewardIssuance, SpatialScan
from app.schemas.resident import (
    DrillHistoryItem,
    ResidentHistoryResponse,
    ResidentHomeResponse,
    ResidentRewardsResponse,
    RewardEligibility,
    RewardRecord,
    SafetyRating,
)
from app.services.rating import apply_decay


def _profile(db: Session, installation_id: str) -> DeviceProfile:
    installation_id = installation_id.strip()
    if not installation_id or len(installation_id) > 128:
        raise ApiException(422, "VALIDATION_ERROR", "installationId tidak valid.")
    profile = db.get(DeviceProfile, installation_id)
    if profile is None:
        profile = DeviceProfile(installation_id=installation_id, safety_rating=0.0, tier="Silver")
        db.add(profile)
        db.flush()
    return profile


def _latest_reward(db: Session, installation_id: str) -> RewardIssuance | None:
    return db.scalar(
        select(RewardIssuance)
        .where(RewardIssuance.installation_id == installation_id)
        .order_by(desc(RewardIssuance.issued_at))
        .limit(1)
    )


def _eligibility(latest: RewardIssuance | None, now: datetime) -> RewardEligibility:
    if latest is None:
        return RewardEligibility(eligible=True, next_eligible_at=None, last_issued_at=None)
    next_at = latest.issued_at + timedelta(days=settings.reward_window_days)
    return RewardEligibility(
        eligible=now >= next_at,
        next_eligible_at=None if now >= next_at else next_at,
        last_issued_at=latest.issued_at,
    )


def _history_item(drill: Drill) -> DrillHistoryItem:
    return DrillHistoryItem(
        drill_id=drill.id,
        scan_id=drill.scan_id,
        reaction_time_ms=drill.reaction_time_ms,
        evacuation_time_ms=drill.evacuation_time_ms,
        posture_score_percentage=drill.posture_score_percentage,
        safety_rating=drill.safety_rating_after,
        tier=drill.tier_after,
        reward_eligible=drill.reward_eligible,
        created_at=drill.created_at,
    )


def get_home(db: Session, installation_id: str, now: datetime | None = None) -> ResidentHomeResponse:
    now = now or utc_now()
    profile = _profile(db, installation_id)
    apply_decay(profile, now)
    latest_reward = _latest_reward(db, installation_id)
    latest_drill = db.scalar(
        select(Drill).where(Drill.installation_id == installation_id).order_by(desc(Drill.created_at)).limit(1)
    )
    latest_scan = db.scalar(
        select(SpatialScan)
        .where(SpatialScan.installation_id == installation_id)
        .order_by(desc(SpatialScan.created_at))
        .limit(1)
    )
    readiness = "needs_scan"
    location_status = None
    if latest_scan:
        readiness = "ready" if latest_scan.status in {"completed", "fallback"} else latest_scan.status
        location_status = "Siap untuk latihan" if readiness == "ready" else "Peta ruangan sedang diproses"
    db.commit()
    return ResidentHomeResponse(
        installation_id=installation_id,
        safety_rating=SafetyRating(
            score=profile.safety_rating,
            tier=profile.tier,
            last_drill_at=profile.last_drill_at,
        ),
        reward_eligibility=_eligibility(latest_reward, now),
        location_status=location_status,
        last_drill=_history_item(latest_drill) if latest_drill else None,
        spatial_readiness=readiness,
    )


def get_rewards(db: Session, installation_id: str, now: datetime | None = None) -> ResidentRewardsResponse:
    now = now or utc_now()
    profile = _profile(db, installation_id)
    apply_decay(profile, now)
    records = db.scalars(
        select(RewardIssuance)
        .where(RewardIssuance.installation_id == installation_id)
        .order_by(desc(RewardIssuance.issued_at))
    ).all()
    db.commit()
    return ResidentRewardsResponse(
        installation_id=installation_id,
        eligibility=_eligibility(records[0] if records else None, now),
        tier=profile.tier,
        records=[
            RewardRecord(
                id=item.id,
                drill_id=item.drill_id,
                issued_at=item.issued_at,
                coupon_code=f"SAFE-{item.id.replace('-', '')[:8].upper()}",
            )
            for item in records
        ],
    )


def _encode_cursor(drill: Drill) -> str:
    payload = json.dumps({"createdAt": drill.created_at.isoformat(), "id": drill.id}).encode()
    return base64.urlsafe_b64encode(payload).decode().rstrip("=")


def _decode_cursor(cursor: str) -> tuple[datetime, str]:
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded).decode())
        return datetime.fromisoformat(payload["createdAt"]), str(payload["id"])
    except Exception:
        raise ApiException(422, "VALIDATION_ERROR", "Cursor riwayat tidak valid.")


def get_history(
    db: Session,
    installation_id: str,
    limit: int,
    cursor: str | None,
) -> ResidentHistoryResponse:
    _profile(db, installation_id)
    query = select(Drill).where(Drill.installation_id == installation_id)
    if cursor:
        created_at, drill_id = _decode_cursor(cursor)
        query = query.where(
            or_(Drill.created_at < created_at, and_(Drill.created_at == created_at, Drill.id < drill_id))
        )
    rows = db.scalars(query.order_by(desc(Drill.created_at), desc(Drill.id)).limit(limit + 1)).all()
    has_more = len(rows) > limit
    visible = rows[:limit]
    db.commit()
    return ResidentHistoryResponse(
        items=[_history_item(item) for item in visible],
        next_cursor=_encode_cursor(visible[-1]) if has_more and visible else None,
    )
