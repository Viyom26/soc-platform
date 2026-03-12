import uuid
import re
import os
import csv
import json
import asyncio

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Form, UploadFile, File, Depends, BackgroundTasks
from sqlalchemy.orm import Session

from openpyxl import load_workbook

from app.database import get_db, SessionLocal
from app.models.threat_log import ThreatLog
from app.models.user_activity import UserActivity
from app.models.incident import Incident

from app.security import require_role
from app.routes.attack_stream import manager

from app.services.alert_service import create_alert
from app.services.detection_engine import detect_port_scan
from app.services.response_engine import automated_response
from app.services.audit_service import log_action


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


@router.get("")
def get_logs(
    db: Session = Depends(get_db),
    user=Depends(require_role("ADMIN", "ANALYST", "VIEWER")),
):

    logs = (
        db.query(ThreatLog)
        .filter(ThreatLog.user_email == user["sub"])
        .order_by(ThreatLog.created_at.desc())
        .limit(1000)
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
                "created_at": log.created_at,
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
    incidents_to_add = []
    incident_ip_cache = set()
    alerts_to_stream = []

    try:

        rows_cache = []

        if filename.endswith(".xlsx"):

            workbook = load_workbook(
                file_path,
                data_only=True,
                read_only=True
            )

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

        def parse_row(row):

            try:

                row_text = " ".join([str(x) for x in row if x])

                event_time = datetime.now(timezone.utc)

                ip_matches = re.findall(r"\b\d{1,3}(?:\.\d{1,3}){3}\b", row_text)

                source_ip = "Unknown"
                destination_ip = DEFAULT_SOC_TARGET

                if len(ip_matches) >= 1:
                    source_ip = ip_matches[0]

                if len(ip_matches) >= 2:
                    destination_ip = ip_matches[1]

                domain_match = re.search(
                    r"\b([a-zA-Z0-9\-]+\.)+[a-zA-Z]{2,}\b",
                    row_text
                )

                domain = None

                if domain_match:
                    domain = domain_match.group(0)

                source_port = "0"
                destination_port = "0"

                protocol = "Unknown"

                row_lower = row_text.lower()

                if "tcp" in row_lower:
                    protocol = "TCP"
                elif "udp" in row_lower:
                    protocol = "UDP"
                elif "icmp" in row_lower:
                    protocol = "ICMP"
                elif "http" in row_lower:
                    protocol = "HTTP"

                severity = "LOW"

                if "critical" in row_lower or "exploit" in row_lower:
                    severity = "CRITICAL"
                elif "attack" in row_lower or "malware" in row_lower:
                    severity = "HIGH"
                elif "scan" in row_lower:
                    severity = "MEDIUM"

                risk_map = {
                    "CRITICAL": 95,
                    "HIGH": 75,
                    "MEDIUM": 50,
                    "LOW": 20,
                    "INFORMATIONAL": 10,
                }

                risk_score = risk_map.get(severity, 10)

                if severity in ["CRITICAL", "HIGH", "MEDIUM"] or risk_score >= 50:

                    if source_ip not in incident_ip_cache:

                        incident_ip_cache.add(source_ip)

                        incidents_to_add.append(
                            Incident(
                                id=str(uuid.uuid4()),
                                source_ip=source_ip,
                                severity=severity,
                                status="OPEN",
                                created_at=event_time
                            )
                        )

                        try:
                            create_alert(
                                db=db,
                                source_ip=source_ip,
                                severity=severity,
                                risk_score=risk_score,
                                message=row_text
                            )

                            alerts_to_stream.append({
                                "source_ip": source_ip,
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
                    source_port=source_port,
                    destination_port=destination_port,
                    protocol=protocol,
                    severity=severity,
                    risk_score=risk_score,
                    classification=row_text,
                    message=domain if domain else row_text,
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

        if logs_to_add:
            db.bulk_save_objects(logs_to_add)

        if incidents_to_add:
            db.bulk_save_objects(incidents_to_add)

        log_action(
            db,
            "LOG_IMPORT",
            username,
            details=f"{len(logs_to_add)} logs imported",
            page="logs"
        )

        db.commit()

        print(f"[SOC] Imported {len(logs_to_add)} logs")

        async def broadcast_alerts():
            for alert in alerts_to_stream[:100]:
                try:
                    await manager.broadcast(alert)
                except Exception as e:
                    print("WebSocket broadcast failed:", e)

        try:
            asyncio.run(broadcast_alerts())
        except Exception as e:
            print("WebSocket loop error:", e)

    finally:
        db.close()