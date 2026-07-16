from datetime import datetime
from fastapi import APIRouter, Query
from app.schemas.resident import (
    ResidentHomeResponse,
    ResidentRewardsResponse,
    ResidentHistoryResponse,
    SafetyRating,
    RewardEligibility,
    SpatialReadiness,
)

router = APIRouter(prefix="/resident", tags=["resident"])


@router.get("/home", response_model=ResidentHomeResponse)
def get_resident_home(installation_id: str = Query(...)):
    # Placeholder: Domain 3 implements full data fetch
    return ResidentHomeResponse(
        installation_id=installation_id,
        safety_rating=SafetyRating(score=0.0, tier="Silver", last_drill_at=None),
        reward_eligibility=RewardEligibility(eligible=True, next_eligible_at=None, last_issued_at=None),
        location_status=None,
        last_drill=None,
        spatial_readiness=SpatialReadiness(
            has_spatial_map=False, scan_id=None, source=None, created_at=None
        ),
    )


@router.get("/rewards", response_model=ResidentRewardsResponse)
def get_resident_rewards(installation_id: str = Query(...)):
    # Placeholder: Domain 3 implements real eligibility + issuance history.
    # Bentuk response sudah mengikuti contract v1 agar Domain 1 dapat
    # mengintegrasikan sekarang tanpa menunggu implementasi penuh.
    return ResidentRewardsResponse(
        eligibility=RewardEligibility(eligible=True, next_eligible_at=None, last_issued_at=None),
        issuances=[],
    )


@router.get("/history", response_model=ResidentHistoryResponse)
def get_resident_history(
    installation_id: str = Query(...),
    limit: int = Query(default=20, le=100),
    cursor: str | None = Query(default=None),
):
    # Placeholder: Domain 3 implements cursor pagination over drills.
    return ResidentHistoryResponse(items=[], next_cursor=None)
