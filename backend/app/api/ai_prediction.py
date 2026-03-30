from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.alert import Alert

router = APIRouter(prefix="/api/predict", tags=["AI Prediction"])


@router.get("")
def get_prediction(db: Session = Depends(get_db)):

    alerts = db.query(Alert).order_by(Alert.id).all()

    # ✅ No data case
    if not alerts:
        return {
            "current": [],
            "predicted": [],
            "delta": 0,
            "status": "No Data"
        }

    # ✅ Ensure proper int conversion (fixes Pylance issues)
    risk_values = []
    for a in alerts:
        if a.risk_score is not None:
            risk_values.append(int(a.risk_score))

    # ✅ Not enough data
    if len(risk_values) < 2:
        return {
            "current": risk_values,
            "predicted": [],
            "delta": 0,
            "status": "Collecting Data"
        }

    # ✅ Last 8 values
    current = risk_values[-8:]

    # ✅ Prediction logic
    predicted = []
    for r in current:
        predicted.append(min(100, int(float(r) * 1.1)))

    # ✅ Delta calculation (explicit int)
    delta = int(current[-1]) - int(current[-2])

    # ✅ Status logic
    status = "Risk Rising" if delta > 0 else "System Stable"

    return {
        "current": current,
        "predicted": predicted,
        "delta": delta,
        "status": status
    }