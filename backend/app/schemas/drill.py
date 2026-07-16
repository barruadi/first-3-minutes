from datetime import datetime
from pydantic import Field
from app.schemas.common import CamelModel, Tier


class DrillMetricsRequest(CamelModel):
    """Mirror DrillMetricsSchema — FROZEN v1.

    Range divalidasi di sini agar Domain 3 menolak metrics mustahil sebelum
    masuk rating service. `completed_at_device` TIDAK dipercaya sebagai sumber
    eligibility; server memakai receipt time (architecture.md §8.4).
    """

    scan_id: str = Field(min_length=1)
    reaction_time_ms: int = Field(ge=0)
    evacuation_time_ms: int = Field(ge=0)
    posture_score_percentage: float = Field(ge=0, le=100)
    completed_at_device: datetime


class DrillCompletionResponse(CamelModel):
    drill_id: str
    accepted: bool
    reward_eligible: bool
    safety_rating: float = Field(ge=0, le=100)
    tier: Tier
    recorded_at: datetime
