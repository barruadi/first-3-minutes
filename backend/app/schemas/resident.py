from datetime import datetime
from pydantic import Field
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
    last_drill: "DrillHistoryItem | None" = None
    spatial_readiness: str = "needs_scan"


class RewardRecord(CamelModel):
    id: str
    drill_id: str
    issued_at: datetime
    coupon_code: str


class ResidentRewardsResponse(CamelModel):
    installation_id: str
    eligibility: RewardEligibility
    tier: str
    records: list[RewardRecord] = Field(default_factory=list)


class DrillHistoryItem(CamelModel):
    drill_id: str
    scan_id: str
    reaction_time_ms: int
    evacuation_time_ms: int
    posture_score_percentage: float
    safety_rating: float
    tier: str
    reward_eligible: bool
    created_at: datetime


class ResidentHistoryResponse(CamelModel):
    items: list[DrillHistoryItem] = Field(default_factory=list)
    next_cursor: str | None = None


ResidentHomeResponse.model_rebuild()
