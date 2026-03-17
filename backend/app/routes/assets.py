from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.asset import Asset
import uuid

router = APIRouter(prefix="/api/assets", tags=["Assets"])


# ================= GET ALL ASSETS =================
@router.get("/")
def get_assets(db: Session = Depends(get_db)):

    assets = db.query(Asset).all()

    return [
        {
            "id": a.id,
            "ip": a.ip,
            "hostname": a.hostname,
            "owner": a.owner,
            "criticality": a.criticality
        }
        for a in assets
    ]


# ================= CREATE ASSET =================
@router.post("/")
def create_asset(
    payload: dict = Body(...),
    db: Session = Depends(get_db)
):

    try:
        asset = Asset(
            id=str(uuid.uuid4()),
            ip=payload.get("ip"),
            hostname=payload.get("hostname"),
            owner=payload.get("owner"),
            criticality=payload.get("criticality")
        )

        db.add(asset)
        db.commit()

        return {
            "message": "Asset created",
            "id": asset.id
        }

    except Exception as e:
        return {"error": str(e)}