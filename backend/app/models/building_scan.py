from datetime import datetime
from sqlalchemy import String, DateTime, Float, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.core.time import utc_now


class BuildingScan(Base):
    __tablename__ = "building_scans"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    installation_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    floor_plan_path: Mapped[str | None] = mapped_column(String, nullable=True)
    mesh_path: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    anchors: Mapped[list["BuildingAnchor"]] = relationship(
        "BuildingAnchor", back_populates="scan", cascade="all, delete-orphan"
    )


class BuildingAnchor(Base):
    __tablename__ = "building_anchors"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    scan_id: Mapped[str] = mapped_column(ForeignKey("building_scans.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    pos_x: Mapped[float] = mapped_column(Float, nullable=False)
    pos_z: Mapped[float] = mapped_column(Float, nullable=False)
    is_exit: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    scan: Mapped["BuildingScan"] = relationship("BuildingScan", back_populates="anchors")


class GuestDrillSession(Base):
    __tablename__ = "guest_drill_sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    anchor_id: Mapped[str] = mapped_column(ForeignKey("building_anchors.id"), nullable=False, index=True)
    duration_seconds: Mapped[float] = mapped_column(Float, nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
