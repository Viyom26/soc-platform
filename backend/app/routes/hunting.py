from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.threat_log import ThreatLog

router = APIRouter(prefix="/api/hunting", tags=["Threat Hunting"])

@router.get("/")
def hunt(
    ip: str = Query(None),
    severity: str = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(ThreatLog)

    if ip:
        query = query.filter(ThreatLog.source_ip == ip)

    if severity:
        query = query.filter(ThreatLog.severity == severity)

    return query.limit(100).all()