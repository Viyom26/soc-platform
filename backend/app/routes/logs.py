from gettext import find
from logging import log
from unittest import result
import uuid
import re
import os
import csv
import json
import asyncio
from fastapi.concurrency import run_in_threadpool
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import or_
from fastapi import APIRouter, Form, UploadFile, File, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from fastapi import Query
from openpyxl import load_workbook

from app.database import get_db, SessionLocal
from app.models.threat_log import ThreatLog
from app.models.user_activity import UserActivity
from app.models.incident import Incident
from app.models.asset import Asset
from app.security import require_role
from app.websocket.manager import manager

from app.services.alert_service import create_alert
from app.services.detection_engine import detect_port_scan, run_detection_engine
from app.services.response_engine import automated_response
from app.services.audit_service import log_action
from app.services.correlation_engine import correlate_alert
from app.services.automation_engine import auto_response
from app.models import alert

router = APIRouter(prefix="/logs", tags=["Logs"])

DEFAULT_SOC_TARGET = "192.168.1.10"

MITRE_MAP = {
    "scan": ("Discovery", "T1046"),
    "probe": ("Discovery", "T1046"),
    "brute": ("Credential Access", "T1110"),
    "login failed": ("Credential Access", "T1110"),
    "malware": ("Execution", "T1059"),
    "exploit": ("Execution", "T1059"),
    "callback": ("Command and Control", "T1071"),
    "c2": ("Command and Control", "T1071"),
    "suspicious": ("Persistence", "T1543"),
    "service": ("Persistence", "T1543"),
    "url": ("Command and Control", "T1071"),   # 🔥 ADD THIS
    "http": ("Command and Control", "T1071"),  # 🔥 ADD THIS
    "https": ("Command and Control", "T1071"), # 🔥 ADD THIS
}

progress_store = {}

def parse_timestamp(row):
    """
    Extract timestamp from Excel/CSV/log row
    """

    for val in row:
        if not val:
            continue

        # ✅ Excel datetime object
        if isinstance(val, datetime):
            return val

        val_str = str(val).strip()

        # ✅ ISO format (2026-03-21T14:40:00)
        try:
            return datetime.fromisoformat(val_str)
        except:
            pass

        # ✅ Common formats (Excel / logs)
        for fmt in [
            "%d/%m/%Y %I:%M:%S %p",   # 21/03/2026 02:41:46 PM
            "%d-%m-%Y %H:%M:%S",      # 21-03-2026 14:41:46
            "%Y-%m-%d %H:%M:%S",      # 2026-03-21 14:41:46
        ]:
            try:
                return datetime.strptime(val_str, fmt)
            except:
                continue

    return None

@router.get("")
def get_logs(
    db: Session = Depends(get_db),
    user=Depends(require_role("ADMIN", "ANALYST", "VIEWER")),
):
    logs = (
        db.query(ThreatLog)
        .filter(ThreatLog.user_email == user["sub"])
        .order_by(ThreatLog.created_at.desc())
        .limit(50000)
        .all()
    )

    items = []

    for log in logs:
        items.append(
            {
                "src_ip": log.source_ip,
                "dst_ip": log.destination_ip,
                "src_port": log.source_port,
                "dst_port": log.destination_port,
                "protocol": log.protocol,
                "severity": log.severity,
                "threat": log.message,
                "created_at": log.created_at.isoformat() if log.created_at else None,  # ✅ FIX HERE
                "mitre_tactic": log.mitre_tactic,
                "mitre_technique": log.mitre_technique,
            }
        )

    return {"items": items}


@router.post("/parse")
async def parse_logs(
    background_tasks: BackgroundTasks,
    raw_text: str = Form(""),
    file: Optional[UploadFile] = File(None),
    user=Depends(require_role("ADMIN", "ANALYST", "VIEWER")),
    db: Session = Depends(get_db),
):

    if not file and not raw_text:
        return {"error": "No file uploaded or raw logs provided"}

    db.query(ThreatLog).delete()
    db.query(Incident).delete()
    

    UPLOAD_DIR = "uploads"
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    filename = file.filename.lower() if file and file.filename else "raw_input.log"
    file_path = f"{UPLOAD_DIR}/{filename}"

    if file:
        with open(file_path, "wb") as f:
            f.write(await file.read())
    else:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(raw_text)

    background_tasks.add_task(
        process_logs,
        file_path,
        filename,
        user["sub"]
    )

    return {"message": "Log processing started in background"}


def process_logs(file_path, filename, username):

    db = SessionLocal()

    logs_to_add = []
    alerts_to_stream = []
    
    # 🚀 PERFORMANCE BOOST (ADD HERE)
    existing_ips = set(
        ip for (ip,) in db.query(Asset.ip).all()
    )

    try:

        rows_cache = []
        total_rows = 0
        processed = 0

        if filename.endswith(".xlsx"):
            workbook = load_workbook(data_only=True, read_only=True, filename=file_path)
            sheet = workbook.active

            rows = list(sheet.iter_rows(values_only=True)) # type: ignore

            if not rows:
                return

            # ✅ HEADER DETECTION
            headers = [str(h).lower().strip() if h else "" for h in rows[0]]

            print("HEADERS:", headers)  # optional debug

            for row in rows[1:]:
                rows_cache.append((headers, row))

        elif filename.endswith(".csv"):
            with open(file_path, encoding="utf-8", errors="ignore") as f:
                reader = csv.reader(f)
                rows = list(reader)

                if rows:
                    headers = [str(h).lower().strip() for h in rows[0]]

                    for row in rows[1:]:
                        rows_cache.append((headers, row))

        elif filename.endswith(".json"):
            with open(file_path, encoding="utf-8", errors="ignore") as f:
                data = json.load(f)
            for entry in data:
                rows_cache.append([
                    entry.get("time"),
                    entry.get("severity"),
                    None,
                    None,
                    entry.get("message"),
                    entry.get("src_ip"),
                    entry.get("dst_ip"),
                    entry.get("protocol")
                ])

        elif filename.endswith(".log") or filename.endswith(".txt"):
            with open(file_path, encoding="utf-8", errors="ignore") as f:
                for line in f:
                    rows_cache.append([None, "LOW", None, None, line.strip()])

        else:
            print("Unsupported file format")
            return
        
        total_rows = len(rows_cache)

        progress_store[username] = {
            "total": total_rows,
            "processed": 0
        }

        def parse_row(data):
    
            try:

                # ✅ HANDLE BOTH TYPES
                if isinstance(data, tuple):
                    headers, row = data

                    row_dict = {}
                    for i, key in enumerate(headers):
                        if key and i < len(row):
                            row_dict[key] = row[i]

                    def find(keywords):
                        for k, v in row_dict.items():
                            for keyword in keywords:
                                if keyword in k:
                                    return v
                        return None

                    source_ip = find(["src", "source"])
                    destination_ip = find(["dst", "destination"])
                    source_port = find(["src port", "source port"]) or "0"
                    destination_port = find(["dst port", "destination port"]) or "0"
                    protocol = (find(["protocol"]) or "UNKNOWN").upper()
                    message = find(["message", "threat", "log"]) or "No message"
                    event_time = find(["time", "date"]) or datetime.now(timezone.utc)
                    file_severity = find(["severity", "level"])
                    
                    if not source_ip:
                        return

                else:
                    # 🔥 SMART PARSING (NON-EXCEL FILES)
                    row = data
                    row_text = " ".join([str(x) for x in row if x])

                    # 🔥 IP DETECTION
                    ip_matches = re.findall(r"\b\d{1,3}(?:\.\d{1,3}){3}\b", row_text)
                    source_ip = ip_matches[0] if ip_matches else "0.0.0.0"
                    destination_ip = ip_matches[1] if len(ip_matches) > 1 else DEFAULT_SOC_TARGET

                    # 🔥 PORT DETECTION
                    port_matches = re.findall(r":(\d{1,5})", row_text)
                    if len(port_matches) >= 2:
                        source_port = port_matches[0]
                        destination_port = port_matches[1]
                    elif len(port_matches) == 1:
                        source_port = port_matches[0]
                        destination_port = "0"
                    else:
                        source_port = "0"
                        destination_port = "0"

                    # 🔥 PROTOCOL DETECTION
                    protocol = "Unknown"
                    if re.search(r"\btcp\b", row_text, re.IGNORECASE):
                        protocol = "TCP"
                    elif re.search(r"\budp\b", row_text, re.IGNORECASE):
                        protocol = "UDP"
                    elif re.search(r"\bicmp\b", row_text, re.IGNORECASE):
                        protocol = "ICMP"
                    elif re.search(r"\bhttp\b", row_text, re.IGNORECASE):
                        protocol = "HTTP"
                    elif re.search(r"\bhttps\b", row_text, re.IGNORECASE):
                        protocol = "HTTPS"

                    # 🔥 MESSAGE
                    message = row_text
                    
                    file_severity = None  # ✅ FIX: avoid undefined variable

                    # 🔥 TIME DETECTION
                    event_time = parse_timestamp(row) or datetime.now(timezone.utc)

                # ✅ FIX TIME
                if isinstance(event_time, str):
                    event_time = parse_timestamp([event_time]) or datetime.now(timezone.utc)

                row_text = str(message)
                row_text_lower = row_text.lower()

                # ================= KEEP YOUR EXISTING LOGIC =================

                # AUTO CREATE ASSET
                try:
                    # 🚀 FAST ASSET CHECK (REPLACE HERE)
                    if source_ip not in existing_ips:
                        existing_ips.add(source_ip)

                        new_asset = Asset(
                            id=str(uuid.uuid4()),
                            ip=source_ip,
                            hostname="Unknown",
                            owner="Auto-Discovered",
                            criticality="LOW"
                        )
                        db.add(new_asset)

                except Exception as e:
                    print("Asset creation failed:", e)

                # PROTOCOL NORMALIZATION
                if file_severity and str(file_severity).strip():
                    severity = str(file_severity).strip().upper()
                else:
                    # SEVERITY DETECTION
                    severity = "LOW"

                    if re.search(r"(critical|ransomware|data breach|root access)", row_text_lower):
                        severity = "CRITICAL"

                    elif re.search(r"(attack|brute force|exploit|malware|unauthorized)", row_text_lower):
                        severity = "HIGH"

                    elif re.search(r"(scan|probe|suspicious|recon)", row_text_lower):
                        severity = "MEDIUM"

                    elif re.search(r"(failed|invalid|denied)", row_text_lower):
                        severity = "LOW"
                        
                    # 🔥 DETECTION ENGINE FIX
                    try:
                        result = detect_port_scan(db, source_ip)

                        if result:
                            print("DETECTION TRIGGERED:", result)

                    except Exception as e:
                        print("Detection failed:", e)

                risk_map = {
                    "CRITICAL": 95,
                    "HIGH": 75,
                    "MEDIUM": 50,
                    "LOW": 20,
                }

                risk_score = risk_map.get(severity, 10)

                # ALERT LOGIC
                if severity in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:

                    try:
                        create_alert(
                            db=db,
                            source_ip=source_ip,
                            severity=severity,
                            message=row_text,
                            risk_score=risk_score,
                            classification=row_text
                        )

                        # 🔥 FIX: LOG = INCIDENT (NO GROUPING)
                        new_incident = Incident(
                            id=str(uuid.uuid4()),
                            source_ip=source_ip,
                            severity=severity or "LOW",
                            status="OPEN",
                            created_at=event_time or datetime.now(timezone.utc),
                            alert_count=1
                        )

                        db.add(new_incident)

                    except Exception as e:
                            print("Alert/Incident failed:", e)

                # MITRE
                mitre_tactic = None
                mitre_technique = None
                for key, value in MITRE_MAP.items():
                    if key in row_text_lower:
                        mitre_tactic, mitre_technique = value
                        break
                    
                # 🔥 FALLBACK (IMPORTANT)
                if not mitre_tactic:
                    mitre_tactic = "Command and Control"
                    mitre_technique = "T1071"

                # ✅ SAFETY FIX (ADD HERE)
                protocol = protocol if protocol else "UNKNOWN"
                
                # SAVE LOG
                log = ThreatLog(
                    id=str(uuid.uuid4()),
                    source_ip=source_ip,
                    destination_ip=destination_ip,
                    source_port=str(source_port),
                    destination_port=str(destination_port),
                    protocol=protocol,
                    severity=severity,
                    risk_score=risk_score,
                    classification=row_text,
                    message=row_text,
                    status="NEW",
                    created_at=event_time,
                    mitre_tactic=mitre_tactic,
                    mitre_technique=mitre_technique,
                    user_email=username
                )

                logs_to_add.append(log)
                
                if len(logs_to_add) >= 2000:
                    db.add_all(logs_to_add)
                    db.commit()
                    logs_to_add.clear()
                
                # 🔥 RUN DETECTION ENGINE
                try:
                    detection_result = run_detection_engine(db, log)

                    # ✅ ADD THIS BLOCK (VERY IMPORTANT)
                    if detection_result and processed % 50 == 0:
                        print("🚨 DETECTED:", detection_result)

                        alert_data = {
                            "source_ip": log.source_ip,
                            "severity": log.severity,
                            "message": f"{detection_result} detected",
                            "risk_score": log.risk_score,
                        }

                        alerts_to_stream.append(alert_data)
                except Exception as e:
                    print("Detection engine error:", e)

            except Exception as e:
                print("ROW ERROR:", e)
                
        for row in rows_cache:
            parse_row(row)
            processed += 1
            
            progress_store[username]["processed"] = processed
            
            if processed % 500 == 0 or processed == total_rows:
                try:
                    asyncio.run(manager.broadcast({
                        "type": "PROGRESS_UPDATE",
                        "processed": processed,
                        "total": total_rows
                    }))
                except:
                    pass

        if logs_to_add:
            db.add_all(logs_to_add)

        log_action(
            db,
            "LOG_IMPORT",
            username,
            details=f"{len(logs_to_add)} logs imported",
            page="logs"
        )
        
        

        db.commit()
        
        progress_store[username] = {
            "processed": progress_store[username]["total"],
            "total": progress_store[username]["total"]
        }

        # ✅ FIXED (SAFE ASYNC EXECUTION)
        async def safe_broadcast():
            for alert in alerts_to_stream[:100]:
                try:
                    # ✅ SEND ALERT
                    await manager.broadcast({
                        "type": "NEW_ALERT",
                        "severity": alert["severity"],
                        "source_ip": alert["source_ip"],
                        "message": alert["message"],
                        "risk_score": alert["risk_score"],
                    })

                    # ✅ SEND PROGRESS SEPARATELY
                    await manager.broadcast({
                        "type": "PROGRESS_UPDATE",
                        "processed": progress_store[username]["processed"],
                        "total": progress_store[username]["total"]
                    })
                except Exception as e:
                    print("Broadcast failed:", e)

        try:
            loop = asyncio.get_running_loop()
            asyncio.create_task(safe_broadcast())  # ✅ BEST FIX
        except RuntimeError:
            asyncio.run(safe_broadcast())
        

    finally:
        db.close()

@router.get("/search")
def search_logs(
        query: str = Query(default=""),
        source_ip: str = Query(default=""),
        destination_ip: str = Query(default=""),
        severity: str = Query(default=""),
        protocol: str = Query(default=""),
        page: int = 1,
        limit: int = 50,
        db: Session = Depends(get_db),
        user=Depends(require_role("ADMIN", "ANALYST", "VIEWER")),
    ):
    
    print("QUERY RECEIVED:", repr(query))

    offset = (page - 1) * limit

    q = db.query(ThreatLog).filter(
        ThreatLog.user_email == user["sub"]
    )
    
    # ✅ Prevent empty search
    if not query and not source_ip and not destination_ip:
        return {"items": []}

    # ✅ Main query search    
    if query and query.strip():
        ip = query.strip()
        
        print("🔍 Searching IP:", ip)

        q = q.filter(
            or_(
                ThreatLog.source_ip.ilike(f"%{ip}%"),
                ThreatLog.destination_ip.ilike(f"%{ip}%")
            )
        )

    elif source_ip:
        ip = source_ip.strip()
        q = q.filter(
            or_(
                ThreatLog.source_ip == ip,
                ThreatLog.destination_ip == ip
            )
        )
    
    if destination_ip:
        q = q.filter(ThreatLog.destination_ip == destination_ip.strip())

    if severity:
        q = q.filter(ThreatLog.severity == severity.upper())

    if protocol:
        q = q.filter(ThreatLog.protocol == protocol.upper())

    logs = (
    q.order_by(ThreatLog.created_at.desc())
    .offset(offset)
    .limit(limit)
    .all()
    )

    items = []

    for log in logs:
        items.append({
            "src_ip": log.source_ip or "N/A",
            "dst_ip": log.destination_ip or "N/A",
            "src_port": log.source_port or "N/A",
            "dst_port": log.destination_port or "N/A",
            "protocol": log.protocol or "UNKNOWN",
            "severity": log.severity or "LOW",
            "threat": log.message or "N/A",
            "created_at": log.created_at.isoformat() if log.created_at else None,
            "mitre_tactic": log.mitre_tactic or "N/A",
            "mitre_technique": log.mitre_technique or "N/A",
        })

    return {"items": items}

@router.get("/hunt")
def threat_hunt(
    ip: str,
    db: Session = Depends(get_db),
    user=Depends(require_role("ADMIN", "ANALYST", "VIEWER")),
):
    from sqlalchemy import or_

    logs = db.query(ThreatLog).filter(
        ThreatLog.user_email == user["sub"],
        or_(
            ThreatLog.source_ip == ip,
            ThreatLog.destination_ip == ip
        )
    ).order_by(ThreatLog.created_at.desc()).limit(200).all()

    if not logs:
        return {"items": []}

    items = []

    for log in logs:
        items.append({
            "src_ip": log.source_ip,
            "dst_ip": log.destination_ip,
            "protocol": log.protocol,
            "severity": log.severity,
            "threat": log.message,
            "time": log.created_at.isoformat() if log.created_at else None
        })

    return {"items": items}

@router.get("/progress")
def get_progress(
    user=Depends(require_role("ADMIN", "ANALYST", "VIEWER"))
):
    username = user["sub"]

    progress = progress_store.get(username)

    # ✅ FIX: ensure always valid response
    if not progress:
        return {
            "processed": 0,
            "total": 0,
            "percentage": 0
        }

    processed = progress.get("processed", 0)
    total = progress.get("total", 0)

    # ✅ EXTRA: send percentage (helps frontend)
    percentage = (processed / total * 100) if total > 0 else 0

    return {
        "processed": processed,
        "total": total,
        "percentage": round(percentage, 2)
    }