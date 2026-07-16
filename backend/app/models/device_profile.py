from datetime import datetime
from sqlalchemy import String, DateTime, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class DeviceProfile(Base):
    __tablename__ = "device_profiles"

    installation_id: Mapped[str] = mapped_column(String, primary_key=True)
    safety_rating: Mapped[float] = mapped_column(Float, default=0.0)
    tier: Mapped[str] = mapped_column(String, default="Silver")
    last_drill_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_decay_week: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
