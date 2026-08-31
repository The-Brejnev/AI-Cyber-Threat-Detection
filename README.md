# CyberGuard AI
## AI/ML-Based Intelligent Network Threat Detection and Security Monitoring System

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://postgresql.org)

A professional, full-stack cybersecurity monitoring platform featuring real-time AI/ML-based threat detection, built as a final-year major project.

---

## Features

| Feature | Description |
|---------|-------------|
| 🔐 **Authentication** | JWT-based auth, bcrypt hashing, email OTP for registration and password reset |
| 🤖 **AI/ML Detection** | Random Forest + Isolation Forest ensemble, 14 threat categories, real confidence scores |
| ⚡ **Real-Time Monitoring** | WebSocket-based live threat feed, auto-updating dashboard |
| 🗺️ **GeoIP Visualization** | Interactive Leaflet map with threat source locations |
| 📊 **Security Analytics** | 6 professional Recharts visualizations, ML performance metrics |
| 🔔 **Notifications** | In-app, email (SMTP), and optional SMS (Twilio) |
| 🚫 **IP Blocking** | Blocked IP management with history |
| 📋 **Audit Logging** | Complete audit trail of security-relevant actions |
| 👤 **Multi-User** | Strict user data isolation via user_id at the database query level |
| 📱 **Responsive** | Works on desktop, tablet, and mobile |

## Threat Categories Detected

- Port Scan
- Brute Force
- DDoS / DoS
- Botnet Activity
- Malware Communication
- Suspicious Login
- SQL Injection
- Cross-Site Scripting (XSS)
- Data Exfiltration
- Reconnaissance
- Unauthorized Access
- Anomalous Traffic
- Normal Traffic

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

### 1. Database Setup
```powershell
# Create database in pgAdmin or via psql:
psql -U postgres -c "CREATE DATABASE cyber_threat_detection;"
psql -U postgres -d cyber_threat_detection -f database/schema.sql
```

### 2. Backend
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env with your database password and email credentials
python -m app.ml.train        # Train ML model (one time)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend
```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open: **http://localhost:5173**

---

## Project Structure

```
AI-Cyber-Threat-Detection/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application entry point
│   │   ├── config.py            # Environment-based configuration
│   │   ├── database.py          # SQLAlchemy engine and session
│   │   ├── dependencies.py      # JWT auth dependency injection
│   │   ├── models/              # SQLAlchemy ORM models (12 tables)
│   │   ├── schemas/             # Pydantic v2 request/response schemas
│   │   ├── routers/             # FastAPI route handlers (10 modules)
│   │   ├── services/            # Business logic services
│   │   ├── ml/                  # AI/ML pipeline
│   │   │   ├── train.py         # Model training script
│   │   │   ├── predict.py       # Real-time prediction
│   │   │   ├── preprocessing.py # Feature extraction
│   │   │   ├── evaluation.py    # Model metrics
│   │   │   └── models/          # Saved .pkl model files
│   │   ├── security/            # JWT and password utilities
│   │   └── utils/               # Pagination, IP utilities
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/          # Sidebar, Header, MainLayout
│   │   │   └── ui/              # Reusable UI components
│   │   ├── pages/
│   │   │   ├── auth/            # Login, Register, ForgotPassword
│   │   │   ├── Dashboard.jsx    # Main dashboard
│   │   │   ├── ThreatAnalysis.jsx
│   │   │   ├── GeoMap.jsx
│   │   │   ├── Analytics.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Settings.jsx
│   │   │   └── BlockedIPs.jsx
│   │   ├── context/             # AuthContext, NotificationContext
│   │   ├── services/            # Axios API service layer
│   │   └── hooks/               # useAuth, useWebSocket
│   ├── package.json
│   └── .env.example
│
├── database/
│   ├── schema.sql               # Complete PostgreSQL schema
│   └── seed.sql                 # Sample data (2 test users)
│
├── docs/
│   ├── setup.md                 # Complete setup guide
│   ├── api.md                   # API reference
│   └── architecture.md          # System architecture
│
└── README.md
```

## Technology Stack

**Frontend:** React 18, Vite 5, Tailwind CSS 3, React Router 6, Recharts, React Leaflet, Lucide React, Axios

**Backend:** Python 3.11, FastAPI, SQLAlchemy 2.0, Pydantic v2, python-jose (JWT), Passlib (bcrypt), aiosmtplib

**Database:** PostgreSQL 14+, compatible with pgAdmin 4

**ML:** scikit-learn (Random Forest, Isolation Forest, StandardScaler), XGBoost, pandas, numpy, joblib

## Test Accounts

After running seed.sql:

| Email | Password | Role |
|-------|----------|------|
| alice@cyberguard.dev | Test1234! | analyst |
| bob@cyberguard.dev | Test1234! | user |

## API Documentation

After starting the backend:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Full API reference: [docs/api.md](docs/api.md)

## Documentation

- [Setup Guide](docs/setup.md) — Installation instructions for Windows
- [API Reference](docs/api.md) — All endpoints documented
- [Architecture](docs/architecture.md) — System design and data flows

## Security

- Passwords hashed with bcrypt (12 rounds)
- OTPs hashed with bcrypt (never stored in plaintext)
- JWT tokens with configurable expiry
- Strict user_id isolation on all database queries
- Rate limiting on authentication and OTP endpoints
- All credentials loaded from environment variables
- CORS configured for specific frontend origin
- Comprehensive audit logging

## License

This project is for educational purposes as a final-year major project.
