from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.detection_rule import DetectionRule
from app.security import require_role
from app.services.audit_service import log_action

router = APIRouter(
    prefix="/api/rules",
    tags=["Rules"]
)


# ======================================
# GET RULES
# ======================================
@router.get("")
def get_rules(
    db: Session = Depends(get_db),
    user=Depends(require_role("ADMIN"))
):

    rules = db.query(DetectionRule).all()

    return [
        {
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "pattern": r.pattern,
            "threshold": r.threshold,
            "severity": r.severity,
            "enabled": r.enabled
        }
        for r in rules
    ]


# ======================================
# TOGGLE RULE ENABLE / DISABLE
# ======================================
@router.patch("/{rule_id}")
def update_rule(
    rule_id: str,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    user=Depends(require_role("ADMIN"))
):

    rule = db.query(DetectionRule).filter(
        DetectionRule.id == rule_id
    ).first()

    if not rule:
        return {"error": "Rule not found"}

    if "enabled" in payload:
        rule.enabled = payload["enabled"]

    db.commit()

    # ✅ FIXED: moved log_action here (it was unreachable before)
    log_action(
        db,
        "RULE_UPDATED",
        user["sub"],
        details=f"Rule {rule_id} updated",
        page="rules"
    )

    return {"message": "Rule updated"}