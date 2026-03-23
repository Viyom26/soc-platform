from sqlalchemy import Column, String, DateTime, Integer
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True, index=True)

    # Source IP related to incident
    source_ip = Column(String, index=True)

    severity = Column(String, index=True)

    status = Column(String, default="OPEN", index=True)

    assigned_to = Column(String, nullable=True)

    owner = Column(String, nullable=True)

    # ✅ ensure consistent UTC timestamps
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    # ⭐ added for SOC updates / tracking
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    
    # ✅ REQUIRED (you already added correctly)
    closed_at = Column(DateTime, nullable=True)

    # ✅ NEW: alert counter (FIXES YOUR ERROR)
    alert_count = Column(Integer, default=1)

    # ✅ NEW: relationship with alerts
    alerts = relationship("Alert", back_populates="incident")