from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import ipaddress
import psutil # pyright: ignore[reportMissingModuleSource]
import socket
from datetime import datetime, timedelta

from app.database import get_db
from app.security import require_role
from app.services.risk_engine import risk_score

import geoip2.database

router = APIRouter(
    prefix="/live-network",
    tags=["Live Network"]
)

# 🔥 ADD THIS (REAL-TIME MEMORY STORE)
LIVE_TRAFFIC = []

# ================= GEOIP INITIALIZATION =================

geo_reader = None
try:
    geo_reader = geoip2.database.Reader("GeoLite2-City.mmdb")
except Exception:
    geo_reader = None


def is_private_ip(ip):
    try:
        return ipaddress.ip_address(ip).is_private
    except Exception:
        return False

# ================= LIVE NETWORK =================

@router.get("")
def get_live_network(
    db: Session = Depends(get_db),
    user=Depends(require_role("ADMIN", "ANALYST", "VIEWER"))
):

    result = []

    # 🔥 TIME WINDOW
    cutoff = datetime.utcnow() - timedelta(seconds=10)

    from collections import defaultdict

    flow_map = defaultdict(set)

    # 🔥 STEP 1 — FILTER + GROUP
    for conn in LIVE_TRAFFIC:

        event_time = conn.get("event_time")

        if event_time:
            try:
                t = datetime.fromisoformat(event_time)
                if t < cutoff:
                    continue
            except:
                continue

        src_ip = conn.get("source_ip")
        dst_ip = conn.get("destination_ip")

        if not src_ip or not dst_ip:
            continue

        # 🚫 ignore docker internal traffic
        if src_ip.startswith("172.") and dst_ip.startswith("172."):
            continue

        flow_map[src_ip].add(dst_ip)

    # 🔥 STEP 2 — BUILD RESPONSE
    for src_ip, destinations in flow_map.items():

        count = len(destinations)

        # 🔥 DETECTION
        if count > 10:
            severity = "HIGH"
        elif count > 5:
            severity = "MEDIUM"
        else:
            severity = "LOW"

        risk = risk_score(
            severity=severity,
            count=count,
            country_risk=0,
            reputation=0
        )

        result.append({
            "source_ip": src_ip,

            # 🔥 SUMMARY
            "destination_ip": f"{count} destinations",

            # 🔥 FULL LIST (frontend expand)
            "destinations": list(destinations),

            "connection_type": "Grouped Traffic",
            "threat": "Possible Scan" if count > 10 else "Normal Traffic",

            "attack_count": count,
            "country": "Multiple",

            "risk_score": risk.get("score"),
            "risk_level": risk.get("level"),
            "confidence": risk.get("confidence"),
        })

    return result[:50]


# ================= TOP TALKERS API =================

@router.get("/top-talkers")
def top_talkers(
    db: Session = Depends(get_db),
    user=Depends(require_role("ADMIN", "ANALYST", "VIEWER"))
):

    return []


# ================= REAL-TIME STREAM (ADD BELOW) =================

from app.websocket.manager import manager

@router.post("/stream")
async def stream_live_network(data: dict):

    print("📡 STREAM:", data)

    # ✅ STORE ONLY REAL DATA
    LIVE_TRAFFIC.append(data)

    # keep last 100 only
    if len(LIVE_TRAFFIC) > 100:
        LIVE_TRAFFIC.pop(0)

    await manager.broadcast({
        "type": "LIVE_TRAFFIC",
        "source_ip": data.get("source_ip"),
        "destination_ip": data.get("destination_ip"),
        "protocol": data.get("protocol"),
    })

    return {"status": "ok"}