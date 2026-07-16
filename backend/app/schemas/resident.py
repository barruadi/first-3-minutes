from datetime import datetime
from pydantic import Field
from app.schemas.common import CamelModel, Tier, SpatialMapSource


class SafetyRating(CamelModel):
    score: float = Field(ge=0, le=100)
    tier: Tier
    last_drill_at: datetime | None = None


class RewardEligibility(CamelModel):
    eligible: bool
    next_eligible_at: datetime | None = None
    last_issued_at: datetime | None = None


class LastDrillSummary(CamelModel):
    drill_id: str
    scan_id: str
    reaction_time_ms: int = Field(ge=0)
    evacuation_time_ms: int = Field(ge=0)
    posture_score_percentage: float = Field(ge=0, le=100)
    safety_rating: float = Field(ge=0, le=100)
    tier: Tier
    completed_at: datetime


class SpatialReadiness(CamelModel):
    has_spatial_map: bool
    scan_id: str | None = None
    source: SpatialMapSource | None = None
    created_at: datetime | None = None


class ResidentHomeResponse(CamelModel):
    """GET /api/resident/home — FROZEN v1 (PRD §6.1, architecture.md §10.2).

    `last_drill` dan `spatial_readiness` ditambahkan pada freeze v1. Tanpa
    keduanya Domain 1 tidak dapat merender "ringkasan latihan terakhir" dan
    status scan yang diwajibkan PRD §6.1 tanpa menghitung sendiri.
    """

    installation_id: str
    safety_rating: SafetyRating
    reward_eligibility: RewardEligibility
    location_status: str | None = None
    last_drill: LastDrillSummary | None = None
    spatial_readiness: SpatialReadiness


class RewardIssuance(CamelModel):
    issuance_id: str
    drill_id: str
    cycle_started_at: datetime
    issued_at: datetime


class ResidentRewardsResponse(CamelModel):
    """GET /api/resident/rewards — FROZEN v1."""

    eligibility: RewardEligibility
    issuances: list[RewardIssuance] = []


class DrillHistoryItem(CamelModel):
    drill_id: str
    scan_id: str
    reaction_time_ms: int = Field(ge=0)
    evacuation_time_ms: int = Field(ge=0)
    posture_score_percentage: float = Field(ge=0, le=100)
    safety_rating: float = Field(ge=0, le=100)
    tier: Tier
    reward_eligible: bool
    completed_at: datetime


class ResidentHistoryResponse(CamelModel):
    """GET /api/resident/history — FROZEN v1.

    Urutan dibekukan: completed_at DESC. `next_cursor` None berarti akhir data.
    """

    items: list[DrillHistoryItem] = []
    next_cursor: str | None = None
