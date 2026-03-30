from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.threat_log import ThreatLog

router = APIRouter(prefix="/api/search", tags=["Search"])

@router.get("/")
def search_logs(
    source_ip: str = Query(None),
    destination_ip: str = Query(None),
    protocol: str = Query(None),
    severity: str = Query(None),
    page: int = 1,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(ThreatLog)

    # 🔍 FILTERS
    if source_ip:
        query = query.filter(ThreatLog.source_ip.ilike(f"%{source_ip}%"))

    if destination_ip:
        query = query.filter(ThreatLog.destination_ip.ilike(f"%{destination_ip}%"))

    if protocol:
        query = query.filter(ThreatLog.protocol.ilike(f"%{protocol}%"))

    if severity:
        query = query.filter(ThreatLog.severity.ilike(f"%{severity}%"))

    # 📊 TOTAL COUNT
    total = query.count()

    # 📄 PAGINATION
    logs = (
        query
        .order_by(ThreatLog.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "items": logs,
        "total": total,
        "page": page,
        "limit": limit
    }