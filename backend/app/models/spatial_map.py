from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class SpatialMap(Base):
    __tablename__ = "spatial_maps"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    scan_id: Mapped[str] = mapped_column(ForeignKey("spatial_scans.scan_id"), unique=True, nullable=False)
    origin_json: Mapped[str] = mapped_column(Text, default='{"x":0,"y":0,"z":0}')
    safe_zones_json: Mapped[str] = mapped_column(Text, default="[]")
    hazard_zones_json: Mapped[str] = mapped_column(Text, default="[]")
    exit_points_json: Mapped[str] = mapped_column(Text, default="[]")
    source: Mapped[str] = mapped_column(String, default="fallback")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    scan: Mapped["SpatialScan"] = relationship(back_populates="spatial_map")
