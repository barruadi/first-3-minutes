from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class FloorPlan(Base):
    __tablename__ = "floor_plans"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    building_id: Mapped[str] = mapped_column(ForeignKey("buildings.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    file_url: Mapped[str | None] = mapped_column(String, nullable=True)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    building: Mapped["Building"] = relationship(back_populates="floor_plans")
    locations: Mapped[list["Location"]] = relationship(back_populates="floor_plan")
