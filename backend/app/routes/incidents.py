from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.threat_log import ThreatLog
from app.models.incident import Incident
from app.security import require_role
from datetime import datetime
from app.services.audit_service import log_action

router = APIRouter(
    prefix="/api/incidents",
    tags=["Incidents"]
)


@router.patch("/{incident_id}/assign")
def assign_incident(
    incident_id: str,
    payload: dict = Body(...),
    user=Depends(require_role("ADMIN","ANALYST")),
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(
        Incident.id == incident_id
    ).first()

    if not incident:
        return {"error": "Incident not found"}

    incident.owner = payload.get("owner")
    incident.updated_at = datetime.utcnow()  # ✅ NEW
    db.commit()

    log_action(
        db,
        "INCIDENT_ASSIGN",
        user["sub"],
        details=f"Incident assigned to {payload.get('owner')}",
        page="incidents"
    )

    return {"message": "Owner assigned"}


@router.patch("/{incident_id}/status")
def update_status(
    incident_id: str,
    payload: dict = Body(...),
    user=Depends(require_role("ADMIN","ANALYST")),
    db: Session = Depends(get_db)
):

    incident = db.query(Incident).filter(
        Incident.id == incident_id
    ).first()

    if not incident:
        return {"error": "Incident not found"}

    new_status = payload.get("status")

    if not new_status:
        return {"error": "Status required"}

    incident.status = new_status
    incident.updated_at = datetime.utcnow()  # ✅ NEW

    # ✅ AUTO CLOSE TIME
    if new_status == "CLOSED":
        incident.closed_at = datetime.utcnow()

    db.commit()

    log_action(
        db,
        "INCIDENT_STATUS_UPDATE",
        user["sub"],
        details=f"Incident status updated to {new_status}",
        page="incidents"
    )

    return {"message": "Status updated"}


# =========================================
# GET INCIDENT TIMELINE FOR SPECIFIC IP
# =========================================
@router.get("/{ip}/timeline")
def get_incident_timeline(
    ip: str,
    user=Depends(require_role("ADMIN", "ANALYST", "VIEWER")),
    db: Session = Depends(get_db)
):

    print("TIMELINE REQUEST FOR:", ip)

    logs = (
        db.query(ThreatLog)
        .filter(ThreatLog.source_ip == ip)
        .order_by(ThreatLog.created_at.asc())
        .limit(200)
        .all()
    )

    incidents = (
        db.query(Incident)
        .filter(Incident.source_ip == ip)
        .order_by(Incident.created_at.asc())
        .limit(50)
        .all()
    )

    timeline = []

    for log in logs:

        timestamp = None
        if getattr(log, "created_at", None):
            try:
                timestamp = log.created_at.isoformat()
            except:
                timestamp = str(log.created_at)

        timeline.append({
            "type": "log",
            "ip": ip,
            "message": getattr(log, "message", "Log Event"),
            "severity": getattr(log, "severity", "INFO"),
            "timestamp": timestamp,
        })

    for inc in incidents:

        timestamp = None
        if getattr(inc, "created_at", None):
            try:
                timestamp = inc.created_at.isoformat()
            except:
                timestamp = str(inc.created_at)

        timeline.append({
            "type": "incident",
            "ip": ip,
            "message": f"INCIDENT {inc.status}",  # ✅ UPDATED
            "severity": getattr(inc, "severity", "INFO"),
            "timestamp": timestamp,
        })

    timeline.sort(
        key=lambda x: x.get("timestamp") if x.get("timestamp") else ""
    )

    return timeline