from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db import get_db # pyright: ignore[reportMissingImports]
from app.models.incident import Incident
from app.services.pdf_exporter import generate_incident_pdf

router = APIRouter(prefix="/api/export", tags=["Export"])


@router.get("/incident/{id}")
def export_incident(id: int, db: Session = Depends(get_db)): # type: ignore

    incident = db.query(Incident).filter(Incident.id == id).first()

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    file_path = generate_incident_pdf(incident)

    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=f"incident_{id}.pdf"
    )