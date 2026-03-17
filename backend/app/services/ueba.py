def detect_anomaly(log):
    
    # Simple rule
    if log["failed_logins"] > 5:
        return {
            "type": "UEBA_ALERT",
            "risk": "HIGH"
        }

    return None