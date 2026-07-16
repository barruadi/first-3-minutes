from datetime import datetime
from fastapi import APIRouter
from app.schemas.drill import DrillMetricsRequest, DrillCompletionResponse

router = APIRouter(prefix="/drills", tags=["drill"])


@router.post("/{drill_id}/complete", response_model=DrillCompletionResponse)
def complete_drill(drill_id: str, body: DrillMetricsRequest):
    # Placeholder: Domain 3 implements full rating engine, reward eligibility, decay
    return DrillCompletionResponse(
        drill_id=drill_id,
        accepted=True,
        reward_eligible=False,
        safety_rating=0.0,
        tier="Silver",
        recorded_at=datetime.utcnow(),
    )
