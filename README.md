# SOC Platform

A Security Operations Center (SOC) monitoring platform for detecting, analyzing, and visualizing cybersecurity threats in real time.

This project provides tools for **log analysis, threat intelligence enrichment, network monitoring, and security event visualization** through an interactive security dashboard.

The goal of the platform is to simulate capabilities found in real **SIEM (Security Information and Event Management)** systems used by security teams.

---

# Table of Contents

* Features
* Dashboard Preview
* Architecture
* Modules
* Installation
* Project Structure
* Future Improvements
* Author

---

# Features

### Core Security Monitoring

* Log Parsing and Security Event Ingestion
* Threat Intelligence Enrichment
* Live Network Monitoring
* Attack Surface Monitoring
* Risk Scoring Engine

### Detection & Analysis

* MITRE ATT&CK Mapping
* Security Event Correlation
* Incident Investigation Panel
* IP Reputation Analysis

### Visualization

* SOC Security Dashboard
* Live Attack Stream
* Global Threat Intelligence Map
* Severity Distribution Charts
* Alert Trend Analysis

### Real-Time Capabilities

* WebSocket-based Live Alerts
* Continuous Log Monitoring
* Live Threat Activity Feed

---

# Dashboard Preview

### Main SOC Dashboard

<img width="1909" height="918" alt="dashboard" src="https://github.com/user-attachments/assets/6a9d63fc-1ef7-4173-ab1f-892659cd5e65" />

---

### Threat Intelligence Module

<img src="https://github.com/user-attachments/assets/883b11bf-5125-4370-b189-70d9db520763" width="900">

---

### Live Network Monitoring

<img src="https://github.com/user-attachments/assets/d5c80712-ada8-4780-b0ed-33eb225bfe8c" width="900">

---

# Architecture

## Frontend

* Next.js
* TypeScript
* TailwindCSS
* Recharts (Security analytics visualization)

## Backend

* FastAPI
* Python
* SQLAlchemy
* GeoIP Intelligence

---

# Modules

## Log Parser

Uploads and parses security logs such as:

* Firewall logs
* IDS / IPS logs
* Network activity logs
* Security alerts

These logs are normalized into structured events for analysis.

---

## Threat Intelligence

Enriches log data with:

* IP reputation scoring
* Geolocation intelligence
* Threat context information

This helps analysts understand whether an IP address is potentially malicious.

---

## Live Network Monitoring

Displays active network connections and traffic behavior from monitored infrastructure.

Security teams can observe:

* Source and destination connections
* Active communication patterns
* Suspicious activity

---

## MITRE ATT&CK Mapping

Maps detected behavior patterns to **MITRE ATT&CK techniques**, allowing analysts to understand attacker tactics and techniques.

---

## Risk Engine

Calculates risk scores using factors such as:

* Event severity
* Event frequency
* Threat intelligence results
* Behavioral indicators

---

## Incident Investigation Panel

Allows analysts to click an attacker IP and view:

* Full attack timeline
* Target systems
* Severity history
* MITRE techniques involved

This simulates real **SOC analyst investigation workflows**.

---

# Installation

## Clone the Repository

```bash
git clone https://github.com/Viyom26/soc-platform.git
cd soc-platform
```

---

# Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend API will run on:

```
http://localhost:8000
```

API Documentation:

```
http://localhost:8000/docs
```

---

# Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend dashboard will run on:

```
http://localhost:3000
```

---

# Project Structure

```
soc-platform
│
├── backend
│   ├── routes
│   ├── models
│   ├── services
│   ├── database
│   └── main.py
│
├── frontend
│   ├── app
│   ├── components
│   ├── styles
│   └── lib
│
├── screenshots
│
└── README.md
```

---

# Future Improvements

Possible future enhancements:

* Machine learning based attack detection
* Network packet inspection
* Automated threat correlation
* SOC automation workflows
* Integration with external threat intelligence feeds

---

# Author

**Viyom Jagtap**

Cybersecurity & Software Development Enthusiast

GitHub:
https://github.com/Viyom26
