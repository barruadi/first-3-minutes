from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class QrToken(Base):
    __tablename__ = "qr_tokens"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    token_hash: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    location_id: Mapped[str] = mapped_column(ForeignKey("locations.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    location: Mapped["Location"] = relationship(back_populates="qr_tokens")
