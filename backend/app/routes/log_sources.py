import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.log_source import LogSource
from pydantic import BaseModel

router = APIRouter(prefix="/log-sources", tags=["Log Sources"])


@router.get("")
def get_sources(db: Session = Depends(get_db)):
    return db.query(LogSource).all()


class LogSourceCreate(BaseModel):
    name: str
    source_type: str
    description: str | None = ""


@router.post("")
def create_source(data: LogSourceCreate, db: Session = Depends(get_db)):

    source = LogSource(
        id=str(uuid.uuid4()),
        name=data.name,
        source_type=data.source_type,
        description=data.description,
        enabled=True
    )

    db.add(source)
    db.commit()

    return {"status": "created"}


@router.patch("/{id}/toggle")
def toggle_source(id: str, db: Session = Depends(get_db)):

    source = db.query(LogSource).filter(LogSource.id == id).first()

    if not source:
        return {"error": "not found"}

    source.enabled = not source.enabled
    db.commit()

    return {"enabled": source.enabled}