from datetime import datetime
from sqlalchemy import String, DateTime, Integer, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class DrillMetrics(Base):
    __tablename__ = "drill_metrics"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    drill_id: Mapped[str] = mapped_column(ForeignKey("drills.id"), unique=True, nullable=False)
    reaction_time_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    evacuation_time_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    posture_score_percentage: Mapped[float] = mapped_column(Float, nullable=False)
    completed_at_device: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    received_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    drill: Mapped["Drill"] = relationship(back_populates="drill_metrics")
