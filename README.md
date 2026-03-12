# SOC Platform

A Security Operations Center (SOC) monitoring platform for detecting, analyzing, and visualizing cybersecurity threats in real time.

This project provides tools for log analysis, threat intelligence enrichment, network monitoring, and security event visualization through a modern dashboard.

---

## Features

- Log Parsing and Security Event Ingestion
- Threat Intelligence Enrichment
- Live Network Monitoring
- MITRE ATT&CK Mapping
- Risk Scoring Engine
- Attack Surface Monitoring
- Security Dashboard Visualization

---

## Dashboard Preview

### Main Dashboard

<img src="https://github.com/user-attachments/assets/3a3ab03e-8b7c-4566-8d44-e43c7c3b2706" width="900">

### Threat Intelligence

<img src="https://github.com/user-attachments/assets/883b11bf-5125-4370-b189-70d9db520763" width="900">

### Live Network Monitoring

<img src="https://github.com/user-attachments/assets/d5c80712-ada8-4780-b0ed-33eb225bfe8c" width="900">

---

## Architecture

### Frontend
- Next.js
- TypeScript
- TailwindCSS

### Backend
- FastAPI
- Python
- SQLAlchemy
- GeoIP

---

## Modules

### Log Parser
Uploads and parses security logs such as firewall logs, IDS logs, and other security events.

### Threat Intelligence
Enriches log data with IP reputation, geolocation, and threat intelligence context.

### Live Network Monitoring
Displays active connections and network activity from the monitored server or infrastructure.

### MITRE ATT&CK Mapping
Maps detected activity patterns to MITRE ATT&CK techniques to help understand attacker behavior.

### Risk Engine
Calculates risk scores based on event severity, frequency, and threat intelligence data.

### Dashboard
Provides visual insights into detected threats and security activity.

---

## Installation

### Clone the Repository

```bash
git clone https://github.com/Viyom26/soc-platform.git
cd soc-platform
```

---

## Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

The backend API will run on:

```
http://localhost:8000
```

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend dashboard will run on:

```
http://localhost:3000
```

---

## Project Structure

```
soc-platform/
│
├── backend/
│   ├── routes/
│   ├── models/
│   ├── services/
│   ├── database/
│   └── main.py
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── styles/
│   └── lib/
│
└── README.md
```

---

## Future Improvements

- Automated attack detection
- Network packet analysis
- Threat correlation engine
- Alerting system
- SOC automation workflows

---

## Author

**Viyom Jagtap**

Cybersecurity & Software Development Enthusiast

GitHub:  
https://github.com/Viyom26
