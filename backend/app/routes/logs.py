import uuid
import re
import os
import csv
import json
import asyncio
from fastapi.concurrency import run_in_threadpool
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Form, UploadFile, File, Depends, BackgroundTasks
from sqlalchemy.orm import Session

from openpyxl import load_workbook

from app.database import get_db, SessionLocal
from app.models.threat_log import ThreatLog
from app.models.user_activity import UserActivity
from app.models.incident import Incident
from app.models.asset import Asset
from app.security import require_role
from app.websocket.manager import manager

from app.services.alert_service import create_alert
from app.services.detection_engine import detect_port_scan
from app.services.response_engine import automated_response
from app.services.audit_service import log_action
from app.services.correlation_engine import correlate_alert
from app.services.automation_engine import auto_response
from app.models import alert

router = APIRouter(prefix="/logs", tags=["Logs"])

DEFAULT_SOC_TARGET = "192.168.1.10"

MITRE_MAP = {
    "port scan": ("Discovery", "T1046"),
    "brute force": ("Credential Access", "T1110"),
    "callback": ("Command and Control", "T1071"),
    "suspicious service": ("Persistence", "T1543"),
    "malicious behavior": ("Execution", "T1059"),
    "unregistered service": ("Persistence", "T1543"),
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
        .limit(200)
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
                "created_at": log.created_at.isoformat() if log.created_at else None,
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
    db.commit()

    UPLOAD_DIR = "uploads"
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    filename = file.filename.lower() if file else "raw_input.log"
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

    try:

        rows_cache = []
        total_rows = 0
        processed = 0

        if filename.endswith(".xlsx"):
            workbook = load_workbook(data_only=True, read_only=True, filename=file_path)
            sheet = workbook.active
            for row in sheet.iter_rows(min_row=2, values_only=True):
                rows_cache.append(row)

        elif filename.endswith(".csv"):
            with open(file_path, encoding="utf-8", errors="ignore") as f:
                reader = csv.reader(f)
                for row in reader:
                    rows_cache.append(row)

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

        def parse_row(row):

            try:

                row_text = " ".join([str(x) for x in row if x])
                event_time = parse_timestamp(row) or datetime.now(timezone.utc)

                ip_matches = re.findall(r"\b\d{1,3}(?:\.\d{1,3}){3}\b", row_text)

                source_ip = ip_matches[0] if ip_matches else "0.0.0.0"
                destination_ip = ip_matches[1] if len(ip_matches) > 1 else DEFAULT_SOC_TARGET
                
                # ================= AUTO CREATE ASSET =================
                try:
                    existing_asset = db.query(Asset).filter(
                        Asset.ip == source_ip
                    ).first()

                    if not existing_asset:

                        new_asset = Asset(
                            id=str(uuid.uuid4()),
                            ip=source_ip,
                            hostname="Unknown",
                            owner="Auto-Discovered",
                            criticality="LOW"
                        )

                        db.add(new_asset)
                        db.commit()

                        print(f"[ASSET] New asset discovered: {source_ip}")

                except Exception as e:
                    print("Asset creation failed:", e)

                row_lower = row_text.lower()

                protocol = "Unknown"
                if "tcp" in row_lower:
                    protocol = "TCP"
                elif "udp" in row_lower:
                    protocol = "UDP"
                elif "icmp" in row_lower:
                    protocol = "ICMP"

                severity = "LOW"
                if "critical" in row_lower:
                    severity = "CRITICAL"
                elif "attack" in row_lower:
                    severity = "HIGH"
                elif "scan" in row_lower:
                    severity = "MEDIUM"

                risk_map = {
                    "CRITICAL": 95,
                    "HIGH": 75,
                    "MEDIUM": 50,
                    "LOW": 20,
                }

                risk_score = risk_map.get(severity, 10)

                # 🔥 CORRELATION + AUTOMATION (FIXED POSITION)
                if severity in ["CRITICAL", "HIGH", "MEDIUM"] or risk_score >= 50:

                    try:
                        incident = correlate_alert(db, {
                            "ip": source_ip,
                            "severity": severity
                        })

                        auto_response(db, incident)

                    except Exception as e:
                        print("Correlation failed:", e)

                    # 🔥 ALERT CREATION (FIXED CORRECT)
                    try:
                        create_alert(
                            db=db,
                            source_ip=source_ip,
                            severity=severity,
                            message=row_text,
                            risk_score=risk_score,
                            classification=row_text
                        )

                        # ✅ ALWAYS append after success
                        alerts_to_stream.append({
                            "source_ip": source_ip,
                            "destination_ip": destination_ip,
                            "severity": severity,
                            "risk_score": risk_score,
                            "message": row_text
                        })
                    
                    except Exception as e:
                        print("Alert creation failed:", e)

                mitre_tactic = None
                mitre_technique = None

                for key, value in MITRE_MAP.items():
                    if key in row_lower:
                        mitre_tactic, mitre_technique = value
                        break

                log = ThreatLog(
                    id=str(uuid.uuid4()),
                    source_ip=source_ip,
                    destination_ip=destination_ip,
                    source_port="0",
                    destination_port="0",
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

            except Exception as e:
                print("ROW ERROR:", e)

        for row in rows_cache:
            parse_row(row)
            processed += 1
            
            progress_store[username]["processed"] = processed
            
            # 🔥 SEND LIVE PROGRESS EVERY 50 LOGS
            if processed % 50 == 0:
                try:
                    asyncio.run(manager.broadcast({
                        "type": "PROGRESS_UPDATE",
                        "processed": processed,
                        "total": total_rows
                    }))
                except:
                    pass
            
            try:
                asyncio.run(manager.broadcast({
                    "type": "PROGRESS_UPDATE",
                    "processed": processed,
                    "total": total_rows
                }))
            except:
                pass

        if logs_to_add:
            db.bulk_save_objects(logs_to_add)

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
    query: str = "",
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    user=Depends(require_role("ADMIN", "ANALYST", "VIEWER")),
):

    offset = (page - 1) * limit

    q = db.query(ThreatLog).filter(
        ThreatLog.user_email == user["sub"]
    )

    if query:
        q = q.filter(
            ThreatLog.source_ip.contains(query) |
            ThreatLog.message.contains(query)
        )

    logs = (
        q.order_by(ThreatLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return logs

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