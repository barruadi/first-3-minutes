from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Location(Base):
    __tablename__ = "locations"
    __table_args__ = (UniqueConstraint("building_id", "location_ref"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    building_id: Mapped[str] = mapped_column(ForeignKey("buildings.id"), nullable=False)
    floor_plan_id: Mapped[str | None] = mapped_column(ForeignKey("floor_plans.id"), nullable=True)
    location_ref: Mapped[str] = mapped_column(String, nullable=False)
    label: Mapped[str] = mapped_column(String, nullable=False)
    origin_json: Mapped[str] = mapped_column(Text, default='{"x":0,"y":0,"z":0}')
    route_points_json: Mapped[str] = mapped_column(Text, default="[]")
    exit_point_json: Mapped[str] = mapped_column(Text, default='{"x":0,"y":0,"z":0}')
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    building: Mapped["Building"] = relationship(back_populates="locations")
    floor_plan: Mapped["FloorPlan | None"] = relationship(back_populates="locations")
    qr_tokens: Mapped[list["QrToken"]] = relationship(back_populates="location")
