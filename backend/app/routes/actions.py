from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import uuid
import subprocess
import platform

from app.database import get_db
from app.models.incident import Incident
from app.models.audit_log import AuditLog

router = APIRouter(prefix="/actions", tags=["Actions"])


# 🚫 BLOCK IP
@router.post("/block-ip")
def block_ip(data: dict, db: Session = Depends(get_db)):
    ip = data.get("ip")

    if not ip:
        raise HTTPException(status_code=400, detail="IP required")

    try:
        # 🔥 REAL FIREWALL SUPPORT
        if platform.system() == "Linux":
            subprocess.run(["iptables", "-A", "INPUT", "-s", ip, "-j", "DROP"])
        elif platform.system() == "Windows":
            subprocess.run([
                "netsh", "advfirewall", "firewall", "add", "rule",
                f"name=Block_{ip}",
                "dir=in",
                "action=block",
                f"remoteip={ip}"
            ])
        else:
            print(f"[SIMULATION] Block IP: {ip}")

        # 🔥 UPDATE INCIDENT STATUS
        incident = db.query(Incident).filter(
            Incident.source_ip == ip,
            Incident.status == "OPEN"
        ).first()

        if incident:
            incident.status = "BLOCKED"

        # 📝 LOG
        log = AuditLog(
            id=str(uuid.uuid4()),
            action="BLOCK_IP",
            details=f"Blocked IP: {ip}",
            timestamp=datetime.utcnow()
        )

        db.add(log)
        db.commit()

        return {"status": "success"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 🔌 ISOLATE HOST
@router.post("/isolate-host")
def isolate_host(data: dict, db: Session = Depends(get_db)):
    host = data.get("host")

    if not host:
        raise HTTPException(status_code=400, detail="Host required")

    # 🔥 UPDATE INCIDENT STATUS
    incident = db.query(Incident).filter(
        Incident.source_ip == host,
        Incident.status == "OPEN"
    ).first()

    if incident:
        incident.status = "ISOLATED"

    log = AuditLog(
        id=str(uuid.uuid4()),
        action="ISOLATE_HOST",
        details=f"Host isolated: {host}",
        timestamp=datetime.utcnow()
    )

    db.add(log)
    db.commit()

    return {"status": "isolated"}


# ✅ CLOSE INCIDENT
@router.post("/incident/{incident_id}/close")
def close_incident(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()

    if not incident:
        raise HTTPException(status_code=404, detail="Not found")

    incident.status = "CLOSED"
    incident.closed_at = datetime.utcnow()

    db.commit()

    return {"status": "closed"}