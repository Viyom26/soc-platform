def auto_response(db, incident):
    
    if incident.alert_count >= 5 and incident.severity == "HIGH":

        incident.status = "BLOCKED"

        print(f"[AUTO RESPONSE] Blocking IP: {incident.source_ip}")

        db.commit()