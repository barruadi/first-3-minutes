from datetime import datetime
from pydantic import BaseModel
from app.schemas.common import CamelModel


class DrillMetricsRequest(CamelModel):
    scan_id: str
    reaction_time_ms: int
    evacuation_time_ms: int
    posture_score_percentage: float
    completed_at_device: datetime


class DrillCompletionResponse(CamelModel):
    drill_id: str
    accepted: bool
    reward_eligible: bool
    safety_rating: float
    tier: str
    recorded_at: datetime
