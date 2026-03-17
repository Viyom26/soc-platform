from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.incident import Incident

router = APIRouter(prefix="/api/search", tags=["Search"])

@router.get("/")
def search(
    ip: str = None,
    severity: str = None,
    status: str = None,
    db: Session = Depends(get_db)
):
    query = db.query(Incident)

    if ip:
        query = query.filter(Incident.source_ip == ip)

    if severity:
        query = query.filter(Incident.severity == severity)

    if status:
        query = query.filter(Incident.status == status)

    return query.limit(100).all()