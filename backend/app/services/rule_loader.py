from app.models.detection_rule import DetectionRule
import uuid

def load_default_rules(db):

    if db.query(DetectionRule).count() > 0:
        return

    rules = [
        DetectionRule(
            id=str(uuid.uuid4()),
            name="Multiple Failed Logins",
            description="Detect brute force attempts",
            pattern="failed login",
            threshold=5,
            severity="HIGH",
            enabled=True
        ),
        DetectionRule(
            id=str(uuid.uuid4()),
            name="Port Scan Detection",
            description="Detect scanning activity",
            pattern="scan",
            threshold=10,
            severity="MEDIUM",
            enabled=True
        ),
        DetectionRule(
            id=str(uuid.uuid4()),
            name="Suspicious IP Activity",
            description="Detect malicious IP behavior",
            pattern="malicious",
            threshold=1,
            severity="CRITICAL",
            enabled=True
        ),
    ]

    db.add_all(rules)
    db.commit()