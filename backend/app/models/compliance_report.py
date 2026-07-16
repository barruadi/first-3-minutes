from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class ComplianceReport(Base):
    __tablename__ = "compliance_reports"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    building_id: Mapped[str] = mapped_column(ForeignKey("buildings.id"), nullable=False)
    period_from: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    period_to: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    file_url: Mapped[str | None] = mapped_column(String, nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
