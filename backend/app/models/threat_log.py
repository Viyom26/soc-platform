from sqlalchemy import Column, String, Integer, DateTime, Index
from datetime import datetime
from app.database import Base


class ThreatLog(Base):
    __tablename__ = "threat_logs"

    # ✅ PASTE HERE (JUST BELOW __tablename__)
    __table_args__ = (
        Index("idx_source_ip", "source_ip"),
        Index("idx_destination_ip", "destination_ip"),
        Index("idx_severity", "severity"),
        Index("idx_protocol", "protocol"),
    )

    id = Column(String, primary_key=True, index=True)

    # 🔥 Attacker
    source_ip = Column(String, index=True, nullable=False)

    # 🔥 Target
    destination_ip = Column(String, index=True, nullable=True)

    severity = Column(String, index=True)

    risk_score = Column(Integer, index=True)

    classification = Column(String, nullable=True)

    message = Column(String)

    status = Column(String)

    created_at = Column(DateTime, nullable=True, index=True)  # ✅ UPDATED

    # ✅ NEW (DO NOT REMOVE ANYTHING ABOVE)
    ingested_at = Column(DateTime, default=datetime.utcnow, index=True)

    source_port = Column(String, nullable=True)

    destination_port = Column(String, nullable=True)

    protocol = Column(String, nullable=True)

    # 🔐 OWNER USER (IMPORTANT FOR MULTI USER SOC)
    user_email = Column(String, index=True)

    # MITRE ATTACK
    mitre_tactic = Column(String, nullable=True)

    mitre_technique = Column(String, nullable=True)