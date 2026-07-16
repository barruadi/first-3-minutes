from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class RewardIssuance(Base):
    __tablename__ = "reward_issuances"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    installation_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    drill_id: Mapped[str] = mapped_column(ForeignKey("drills.id"), nullable=False)
    cycle_started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    issued_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    drill: Mapped["Drill"] = relationship(back_populates="reward_issuance")
