from sqlalchemy import Column, String, DateTime, Integer
from datetime import datetime
import uuid

from app.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))

    source_ip = Column(String, index=True)
    severity = Column(String, index=True)

    risk_score = Column(Integer)
    reputation = Column(Integer, default=0)

    # ✅ MITRE ATT&CK FIELDS
    mitre_tactic = Column(String)
    mitre_technique = Column(String)

    classification = Column(String)
    message = Column(String)

    status = Column(String, default="Open")

    created_at = Column(DateTime, default=datetime.utcnow, index=True)