from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import uuid4

from app.database import get_db
from app.models.alert import Alert
from app.services.mitre_mapper import map_mitre
from app.services.risk_engine import risk_score
from app.api.websocket import manager
from app.services.ip_reputation import get_ip_reputation

router = APIRouter()


def calculate_severity_from_risk(risk: int) -> str:
    if risk >= 90:
        return "CRITICAL"
    elif risk >= 60:
        return "HIGH"
    elif risk >= 40:
        return "MEDIUM"
    else:
        return "LOW"


@router.post("/")
async def create_alert(data: dict, db: Session = Depends(get_db)):

    # 1️⃣ Incoming values
    incoming_severity = data.get("severity", "LOW").upper()
    count = data.get("count", 1)
    country_risk = data.get("country_risk", 2)
    source_ip = data.get("source_ip")
    if not source_ip:
        source_ip = "0.0.0.0"

    # 2️⃣ 🔥 Get IP reputation
    reputation = get_ip_reputation(source_ip)

    # 3️⃣ Calculate risk using new engine
    risk_data = risk_score(
        incoming_severity,
        count,
        country_risk,
        reputation
    )
    calculated_risk = risk_data["score"]

    # 4️⃣ Auto severity from final risk
    final_severity = calculate_severity_from_risk(calculated_risk)

    # 5️⃣ Create alert object
    alert = Alert(
    id=str(uuid4()),
    source_ip=source_ip,
    severity=final_severity,
    message=data.get("message"),
    status="OPEN",
    risk_score=calculated_risk,
    reputation=reputation  # 🔥 STORE IT
)


    # 6️⃣ MITRE mapping
    tactic, technique = map_mitre(str(alert.severity), str(alert.message))
    alert.mitre_tactic = tactic 
    alert.mitre_technique = technique 

    db.add(alert)
    db.commit()
    db.refresh(alert)

    # 🔎 Debug logs
    print("Incoming Severity:", incoming_severity)
    print("Country Risk:", country_risk)
    print("Count:", count)
    print("IP Reputation:", reputation)
    print("Calculated Risk:", calculated_risk)
    print("Final Severity:", final_severity)

    # 7️⃣ Broadcast to WebSocket
    await manager.broadcast({
        "source_ip": alert.source_ip,
        "severity": alert.severity,
        "risk_score": alert.risk_score,
        "reputation": alert.reputation
    })

    print("🔥 BROADCAST SENT:", alert.source_ip)


    return alert
