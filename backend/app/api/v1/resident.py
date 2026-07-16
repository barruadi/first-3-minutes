from datetime import datetime
from fastapi import APIRouter, Query
from app.schemas.resident import ResidentHomeResponse, SafetyRating, RewardEligibility

router = APIRouter(prefix="/resident", tags=["resident"])


@router.get("/home", response_model=ResidentHomeResponse)
def get_resident_home(installation_id: str = Query(...)):
    # Placeholder: Domain 3 implements full data fetch
    return ResidentHomeResponse(
        installation_id=installation_id,
        safety_rating=SafetyRating(score=0.0, tier="Silver", last_drill_at=None),
        reward_eligibility=RewardEligibility(eligible=False, next_eligible_at=None, last_issued_at=None),
        location_status=None,
    )


@router.get("/rewards")
def get_resident_rewards(installation_id: str = Query(...)):
    # 501: Domain 3 placeholder
    return {"message": "NOT_IMPLEMENTED", "installationId": installation_id, "rewards": []}


@router.get("/history")
def get_resident_history(
    installation_id: str = Query(...),
    limit: int = Query(default=20, le=100),
    cursor: str | None = Query(default=None),
):
    # 501: Domain 3 placeholder
    return {"message": "NOT_IMPLEMENTED", "items": [], "nextCursor": None}
