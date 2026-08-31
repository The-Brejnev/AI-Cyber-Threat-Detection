# CyberGuard AI — System Architecture

## Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  React SPA   │  │  WebSocket   │  │   Leaflet GeoMap     │   │
│  │  (Vite)      │  │  Client      │  │                      │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────┘   │
└─────────┼────────────────┼──────────────────────────────────────┘
          │ HTTP/REST       │ WebSocket
          ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FASTAPI BACKEND (Port 8000)                  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      ROUTERS                              │   │
│  │  /auth  /dashboard  /threats  /devices  /analytics        │   │
│  │  /geo   /notifications  /blocked-ips  /profile            │   │
│  │  /settings  /ws (WebSocket)                               │   │
│  └──────────────────┬───────────────┬────────────────────────┘   │
│                     │               │                             │
│  ┌──────────────────▼───┐  ┌────────▼──────────────────────┐   │
│  │     SERVICES          │  │     ML ENGINE                  │   │
│  │  - AuthService        │  │  - Random Forest Classifier    │   │
│  │  - EmailService       │  │  - Isolation Forest            │   │
│  │  - GeoService         │  │  - Feature Extraction          │   │
│  │  - NotificationSvc    │  │  - Risk Scoring                │   │
│  │  - AuditService       │  │  - 14 Threat Categories        │   │
│  │  - SimulationService  │  └───────────────────────────────┘   │
│  └──────────────────┬───┘                                       │
│                     │                                            │
│  ┌──────────────────▼───────────────────────────────────────┐   │
│  │              WebSocket Manager                            │   │
│  │  Per-user connection pools, broadcast on threat detect   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                            │
│                                                                  │
│  users → user_profiles → user_settings                          │
│       ↓                                                          │
│  devices ← network_events → threat_predictions                  │
│       ↓          ↓                                               │
│  threats ──────────────────────────────────────────────────┐   │
│       ↓                                                     │   │
│  notifications   blocked_ips   scans   otp_codes   audit_logs │  │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│               External Services                                  │
│                                                                  │
│  ip-api.com (GeoIP)  │  Gmail SMTP  │  Twilio SMS (optional)   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow: Threat Detection Pipeline

```
Simulation Service / Manual Event
           │
           ▼
    Network Event Created
    (source_ip, dest_ip, ports, protocol, bytes, flags)
           │
           ▼
    Feature Extraction (20 features)
    - Port normalization
    - Protocol encoding
    - Byte ratios
    - Risk indicators
    - Time-based features
           │
           ▼
    StandardScaler (fitted on training data)
           │
           ▼
    Random Forest Classifier (100 estimators)
    → Predicted class + probabilities
           │
           ├─── NORMAL class? ──────────────────────┐
           │                                        │
           │                              Isolation Forest check
           │                              (anomaly detection backup)
           │                                        │
           ▼                                        ▼
    Threat Classification                 Anomaly detected?
    + Risk Score (0-100)                  → Override to ANOMALOUS_TRAFFIC
    + Confidence (0-1)                    → Risk score 45-65
    + Detection Reason
    + Recommended Action
           │
           ▼
    Severity Assignment
    risk_score > 85 → CRITICAL
    risk_score > 65 → HIGH
    risk_score > 40 → MEDIUM
    else            → LOW
           │
           ├── Save to network_events
           ├── Save to threats
           ├── Save to threat_predictions
           │
           ▼
    Notification Service
    → Check user notification settings
    → Create in-app notification
    → Send email (if configured)
    → Send SMS (if Twilio configured)
           │
           ▼
    WebSocket Broadcast
    → Push to all connected clients for this user
           │
           ▼
    React Dashboard Update
    → Live Events Feed updated
    → Toast notification shown
    → Stats refreshed
```

## Authentication Flow

```
Register:
  /register (email, full_name, phone, password, otp)
       │
       ├── Verify OTP (bcrypt check, expiry, attempt limit)
       ├── Hash password (bcrypt)
       ├── Create user + profile + settings
       └── Redirect to /login

Login:
  /login (email, password)
       │
       ├── Find user by email
       ├── Verify password (bcrypt)
       ├── Create JWT access_token (1 hour) + refresh_token (7 days)
       ├── Update last_login
       ├── Audit log
       └── Return tokens

Protected Route:
  Any /protected endpoint
       │
       ├── Extract Bearer token from Authorization header
       ├── Verify JWT signature (HS256)
       ├── Check expiry
       ├── Load user from DB
       └── Inject user into route handler

User Isolation:
  Every DB query includes WHERE user_id = current_user.id
  Attempting to access another user's resource → 403 Forbidden
```

## Technology Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| ML Algorithm | Random Forest + Isolation Forest | RF for supervised classification (14 classes), IF for unsupervised anomaly detection fallback |
| ORM | SQLAlchemy 2.0 sync | Mature, pgAdmin compatible, easy migrations |
| Auth | JWT (stateless) | Scalable, no session store needed |
| Password hashing | bcrypt (passlib) | Industry standard, strong |
| OTP hashing | bcrypt | Prevents plaintext OTP exposure even if DB is compromised |
| WebSocket | Native FastAPI WS | No additional broker needed for single-server demo |
| GeoIP | ip-api.com | Free tier sufficient, no key required |
| Email | SMTP (aiosmtplib) | Works with Gmail, SendGrid, any SMTP provider |
| Rate limiting | slowapi | Integrates natively with FastAPI |

## Security Design

- **No plaintext passwords** anywhere in DB or logs
- **No plaintext OTPs** in DB (bcrypt hashed)
- **No secrets in source code** — all from .env
- **JWT with expiry** — 1 hour access, 7 day refresh
- **User isolation** — every query filtered by user_id at ORM level
- **Row-level security** possible via PostgreSQL RLS (not implemented by default)
- **Rate limiting** on auth and OTP endpoints
- **Input validation** via Pydantic v2 (strict mode)
- **SQL injection prevention** via SQLAlchemy parameterized queries
- **CORS** configured for specific frontend origin only
- **Audit logging** for all security-relevant actions
