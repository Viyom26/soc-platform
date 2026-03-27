from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models.log import Log  # pyright: ignore[reportMissingImports]
from app.services.score import calculate_ip_score

from datetime import datetime  # ✅ NEW

router = APIRouter(prefix="/api/soc", tags=["SOC"])


@router.get("/ip-analysis/{ip}")
def ip_analysis(ip: str, db: Session = Depends(get_db)):

    logs = db.query(Log).filter(
        or_(Log.source_ip == ip, Log.destination_ip == ip)
    ).all()

    if not logs:
        raise HTTPException(status_code=404, detail="No logs found")

    total_count = len(logs)
    destinations = {}
    ports = set()
    severities = {}
    date_wise = {}
    hourly = {}

    for log in logs:
        # ✅ SAFE destination handling
        dest_ip = log.destination_ip or "UNKNOWN"
        destinations[dest_ip] = destinations.get(dest_ip, 0) + 1

        # ✅ SAFE port detection
        port = log.destination_port or 0
        if log.protocol == "HTTP":
            port = 80
        elif log.protocol == "HTTPS":
            port = 443

        ports.add(port)

        # ✅ SAFE severity
        severity = log.severity or "UNKNOWN"
        severities[severity] = severities.get(severity, 0) + 1

        # ✅ SAFE timestamp
        ts = log.timestamp or datetime.utcnow()

        # Date-wise
        date_key = ts.strftime("%Y-%m-%d")
        date_wise[date_key] = date_wise.get(date_key, 0) + 1

        # Hourly
        hour_key = ts.strftime("%Y-%m-%d %H:00")
        hourly[hour_key] = hourly.get(hour_key, 0) + 1

    # Suspicious threshold
    suspicious = total_count > 100 or len(destinations) > 20

    # Port scan detection
    port_scan_detected = len(ports) > 15

    # Threat scoring (merge your score.py logic)
    base_score = calculate_ip_score(ip)
    activity_score = total_count * 0.3 + len(destinations) * 2 + len(ports) * 3
    threat_score = round(base_score + activity_score, 2)

    # ✅ SAFE first/last seen
    timestamps = [log.timestamp for log in logs if log.timestamp]

    first_seen = min(timestamps) if timestamps else None
    last_seen = max(timestamps) if timestamps else None

    return {
        "ip": ip,
        "total_events": total_count,
        "unique_destinations": len(destinations),
        "destination_frequency": destinations,
        "ports_used": list(ports),
        "severity_breakdown": severities,
        "date_wise_activity": date_wise,
        "hourly_activity": hourly,
        "first_seen": first_seen,
        "last_seen": last_seen,
        "suspicious": suspicious,
        "port_scan_detected": port_scan_detected,
        "threat_score": threat_score
    }