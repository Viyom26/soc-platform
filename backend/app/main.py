import uuid
from datetime import datetime

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from app.utils.security import get_password_hash
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, text
from app.models import User
from app.database import Base, engine, get_db
from app.models import *
from app.models.user import User
from app.models.incident import Incident
from app.models.audit_log import AuditLog
from app.models.threat_log import ThreatLog
from app.database import SessionLocal
from app.routes import ip_intelligence
from app.routes import detection_rules
from app.routes import rules
from app.routes import mitre
from app.routes import attack_timeline
from app.routes import comments
from app.routes import log_sources
from app.routes import compliance
from app.routes import attack_stream
from app.routes import threat_intel
from app.routes import live_network
from app.routes.actions import router as actions_router
from app.routes import hunting
from app.routes import ws
from app.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    require_role,
)
from app.routes import search
from app.routes import ip_analyzer, logs, analytics, history, geo_map, audit
from app.api.geo_ws import router as geo_ws_router
from app.routes.incidents import router as incidents_router
from app.routes import alerts
from app.api.threat_intel import router as threat_intel_router
from app.api.websocket import router as websocket_router
from app.api.ip_combined import router as ip_combined_router
from app.api.country_summary import router as country_summary_router
from app.api.ai_prediction import router as ai_prediction_router
from app.services.audit_service import log_action
from app.routes import actions
from app.routes import assets
from app.models.user import User
from app.services.rule_loader import load_default_rules

# ================= INIT =================

from sqlalchemy.exc import OperationalError, SQLAlchemyError, IntegrityError  # ✅ UPDATED

try:
    Base.metadata.create_all(bind=engine)
except (OperationalError, SQLAlchemyError) as e:  # ✅ UPDATED
    print("⚠️ DB init skipped (already exists or race condition):", e)

app = FastAPI(title="SOC Backend", version="2.2")

# ================= STARTUP EVENT (IMPROVED) =================

@app.on_event("startup")
async def startup_event():
    print("🔥 STARTUP TRIGGERED")

    try:
        # ✅ Create default admin
        create_default_admin()

        # ✅ Load detection rules
        db = SessionLocal()

        print("📊 Checking detection rules...")
        count = db.query(DetectionRule).count()
        print("RULE COUNT BEFORE:", count)

        load_default_rules(db)

        count_after = db.query(DetectionRule).count()
        print("RULE COUNT AFTER:", count_after)

        db.close()

        print("✅ Startup completed")

    except Exception as e:
        print("⚠️ Startup failed:", e)

# ================= DEFAULT ADMIN =================

def create_default_admin():
    db = SessionLocal()

    try:
        existing_admin = db.query(User).filter(User.email == "admin@example.com").first()

        if existing_admin:
            print("✅ Admin already exists, skipping...")
            return

        admin = User(
        id=str(uuid.uuid4()),  # ✅ FIX
        email="admin@example.com",
        hashed_password=get_password_hash("admin123"),
        full_name="Default Admin",
        organization="AttackSurface",
        role="ADMIN",
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        )

        db.add(admin)
        db.commit()
        print("✅ Default admin created")

    except IntegrityError:
        db.rollback()
        print("⚠️ Admin creation skipped (duplicate or race condition)")

    finally:
        db.close()

# ================= CORS =================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= ROUTERS =================

app.include_router(ip_analyzer.router)
app.include_router(logs.router)
app.include_router(analytics.router)
app.include_router(mitre.router)
app.include_router(history.router)
app.include_router(geo_map.router)
app.include_router(audit.router)

# ✅ WebSocket (your main one)
app.include_router(ws.router)

# ⚠️ Keep only if needed (avoid duplication conflicts)
app.include_router(geo_ws_router)

app.include_router(incidents_router)

app.include_router(threat_intel_router)

# ⚠️ If this also uses "/ws", it can conflict — keep if different path


app.include_router(ip_combined_router)
app.include_router(country_summary_router)
app.include_router(ai_prediction_router)

app.include_router(alerts.router)

app.include_router(ip_intelligence.router)
app.include_router(detection_rules.router)
app.include_router(rules.router)

app.include_router(attack_timeline.router)
app.include_router(comments.router)
app.include_router(log_sources.router)

app.include_router(search.router)
app.include_router(compliance.router)
app.include_router(assets.router)

app.include_router(attack_stream.router)

app.include_router(threat_intel.router, prefix="/api")
app.include_router(live_network.router, prefix="/api")

app.include_router(hunting.router, prefix="/logs")
app.include_router(actions.router)

# ================= AUTH =================

class RegisterSchema(BaseModel):
    full_name: str
    organization: str
    role: str
    email: EmailStr
    password: str


@app.post("/auth/register")
def register(data: RegisterSchema, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")

    user = User(
        id=str(uuid.uuid4()),
        email=data.email,
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name,
        organization=data.organization,
        role=data.role.upper(),
        is_active=True,
    )

    db.add(user)
    db.commit()

    return {"message": "User registered successfully"}


@app.post("/auth/login")
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == form.username).first()

    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    log_action(
        db,
        "LOGIN",
        user.email,
        details="User logged in",
        page="auth"
    )

    token = create_access_token({
        "sub": user.email,
        "role": user.role,
    })

    return {
        "access_token": token,
        "token_type": "bearer",
    }


@app.get("/auth/me")
def me(user=Depends(get_current_user)):
    return user

# ================= LOGS =================

@app.get("/logs")
def get_logs(
    user=Depends(require_role("ADMIN", "ANALYST", "VIEWER")),
    db: Session = Depends(get_db),
):
    logs = (
        db.query(ThreatLog)
        .filter(ThreatLog.user_email == user["sub"])
        .order_by(ThreatLog.created_at.desc())
        .limit(100)
        .all()
    )

    return {
        "items": [
            {
                "src_ip": l.source_ip,
                "dst_ip": l.destination_ip,
                "src_port": l.source_port,
                "dst_port": l.destination_port,
                "severity": l.severity,
                "risk_score": l.risk_score,
                "threat": l.classification,
                "classification": l.classification,
                "protocol": l.protocol,
                "message": l.message,
                "created_at": l.created_at.isoformat(),
            }
            for l in logs
        ],
        "total": len(logs),
    }

# ================= INCIDENTS =================

@app.get("/incidents")
def get_incidents(
    user=Depends(require_role("ADMIN", "ANALYST", "VIEWER")),
    db: Session = Depends(get_db),
):
    incidents = db.query(Incident).order_by(desc(Incident.created_at)).all()

    return [
        {
            "id": i.id,
            "ip": i.source_ip,
            "severity": i.severity,
            "status": i.status,
            "created_at": i.created_at.isoformat(),
        }
        for i in incidents
    ]

# ================= SEVERITY CHART =================

@app.get("/api/soc/severity")
def severity_chart(
    user=Depends(require_role("ADMIN", "ANALYST", "VIEWER")),
    db: Session = Depends(get_db),
):
    data = (
        db.query(ThreatLog.severity, func.count(ThreatLog.id))
        .group_by(ThreatLog.severity)
        .all()
    )

    return [{"severity": s, "count": c} for s, c in data]

# ================= DASHBOARD SUMMARY =================

@app.get("/api/soc/summary")
def get_summary(
    user=Depends(require_role("ADMIN", "ANALYST", "VIEWER")),
    db: Session = Depends(get_db),
):
    return {
        "total_alerts": db.query(func.count(ThreatLog.id)).scalar() or 0,

        "critical_alerts": db.query(func.count(ThreatLog.id))
        .filter(ThreatLog.severity == "CRITICAL").scalar() or 0,

        "high_alerts": db.query(func.count(ThreatLog.id))
        .filter(ThreatLog.severity == "HIGH").scalar() or 0,

        "medium_alerts": db.query(func.count(ThreatLog.id))
        .filter(ThreatLog.severity == "MEDIUM").scalar() or 0,

        "low_alerts": db.query(func.count(ThreatLog.id))
        .filter(ThreatLog.severity == "LOW").scalar() or 0,

        "informational_alerts": db.query(func.count(ThreatLog.id))
        .filter(ThreatLog.severity == "INFORMATIONAL").scalar() or 0,

        "open_incidents": db.query(func.count(Incident.id))
        .filter(Incident.status == "OPEN").scalar() or 0,

        "unique_ips": db.query(
            func.count(func.distinct(ThreatLog.source_ip))
        ).scalar() or 0,
    }

# ================= GLOBAL THREAT LEVEL =================

@app.get("/api/soc/threat-level")
def get_threat_level(
    user=Depends(require_role("ADMIN", "ANALYST", "VIEWER")),
    db: Session = Depends(get_db),
):
    logs = db.query(ThreatLog).all()

    if not logs:
        return {"level": "GUARDED"}

    avg_risk = sum(l.risk_score or 0 for l in logs) / len(logs)

    if avg_risk >= 85:
        level = "CRITICAL"
    elif avg_risk >= 70:
        level = "SEVERE"
    elif avg_risk >= 55:
        level = "HIGH"
    elif avg_risk >= 35:
        level = "ELEVATED"
    else:
        level = "GUARDED"

    return {"level": level}

# ================= HEALTH =================

@app.get("/health")
def health_check():
    db_status = "connected"

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        db_status = "disconnected"

    return {
        "api": "running",
        "database": db_status,
    }