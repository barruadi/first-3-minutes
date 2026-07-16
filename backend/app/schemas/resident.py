from datetime import datetime
from app.schemas.common import CamelModel


class SafetyRating(CamelModel):
    score: float
    tier: str
    last_drill_at: datetime | None = None


class RewardEligibility(CamelModel):
    eligible: bool
    next_eligible_at: datetime | None = None
    last_issued_at: datetime | None = None


class ResidentHomeResponse(CamelModel):
    installation_id: str
    safety_rating: SafetyRating
    reward_eligibility: RewardEligibility
    location_status: str | None = None
