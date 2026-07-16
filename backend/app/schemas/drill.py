from datetime import datetime
from pydantic import Field, field_validator
from app.schemas.common import CamelModel


class DrillMetricsRequest(CamelModel):
    scan_id: str
    reaction_time_ms: int
    evacuation_time_ms: int
    posture_score_percentage: float
    completed_at_device: datetime

    @field_validator("reaction_time_ms")
    @classmethod
    def reaction_range(cls, value: int) -> int:
        if not 0 <= value <= 30 * 60 * 1000:
            raise ValueError("reactionTimeMs is out of range")
        return value

    @field_validator("evacuation_time_ms")
    @classmethod
    def evacuation_range(cls, value: int) -> int:
        if not 0 <= value <= 60 * 60 * 1000:
            raise ValueError("evacuationTimeMs is out of range")
        return value

    @field_validator("posture_score_percentage")
    @classmethod
    def posture_range(cls, value: float) -> float:
        if not 0 <= value <= 100:
            raise ValueError("postureScorePercentage must be between 0 and 100")
        return value


class DrillCompletionResponse(CamelModel):
    drill_id: str
    accepted: bool
    reward_eligible: bool
    safety_rating: float
    tier: str
    recorded_at: datetime
