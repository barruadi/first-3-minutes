from datetime import datetime
from sqlalchemy import String, DateTime, Integer, Float, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Drill(Base):
    __tablename__ = "drills"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    installation_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    scan_id: Mapped[str] = mapped_column(ForeignKey("spatial_scans.scan_id"), nullable=False)
    building_id: Mapped[str] = mapped_column(ForeignKey("buildings.id"), nullable=False, index=True)
    reaction_time_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    evacuation_time_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    posture_score_percentage: Mapped[float] = mapped_column(Float, nullable=False)
    accepted: Mapped[bool] = mapped_column(Boolean, default=True)
    reward_eligible: Mapped[bool] = mapped_column(Boolean, default=False)
    safety_rating_after: Mapped[float] = mapped_column(Float, default=0.0)
    tier_after: Mapped[str] = mapped_column(String, default="Silver")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    drill_metrics: Mapped["DrillMetrics | None"] = relationship(back_populates="drill")
    reward_issuance: Mapped["RewardIssuance | None"] = relationship(back_populates="drill")
