from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.incident import Incident
import uuid

def correlate_alert(db: Session, alert):

    existing = db.query(Incident).filter(
        Incident.source_ip == alert["ip"],
        Incident.status != "CLOSED",
        Incident.created_at >= datetime.now(timezone.utc) - timedelta(minutes=5)
    ).first()

    if existing:
        # ✅ NEW: increment alert count
        if existing.alert_count is None:
            existing.alert_count = 1
        else:
            existing.alert_count += 1

        # ✅ update timestamp
        existing.updated_at = datetime.now(timezone.utc)

        db.commit()
        return existing

    new_incident = Incident(
        id=str(uuid.uuid4()),
        source_ip=alert["ip"],
        severity=alert["severity"],
        status="OPEN",
        created_at=datetime.now(timezone.utc),
        alert_count=1  # ✅ NEW
    )

    db.add(new_incident)
    db.commit()

    return new_incident