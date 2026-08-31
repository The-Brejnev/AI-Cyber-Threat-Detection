# CyberGuard AI — API Reference

## Base URL
```
http://localhost:8000
```

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## Authentication Endpoints

### POST /auth/send-otp
Send a one-time password to email.

**Rate limit:** 5 requests/minute per IP

**Request:**
```json
{
  "email": "user@example.com",
  "purpose": "registration" | "password_reset"
}
```

**Response 200:**
```json
{"message": "OTP sent successfully. Check your email."}
```

**Response 429:** Too many requests (resend cooldown active).

---

### POST /auth/verify-otp
Verify an OTP without completing registration.

**Request:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "purpose": "registration"
}
```

**Response 200:**
```json
{"message": "OTP verified successfully.", "verified": true}
```

**Response 400:** Invalid/expired OTP.

---

### POST /auth/register
Complete user registration after OTP verification.

**Request:**
```json
{
  "full_name": "Alice Chen",
  "email": "alice@example.com",
  "phone": "+1-555-0101",
  "password": "SecurePass1!",
  "confirm_password": "SecurePass1!",
  "otp": "123456"
}
```

**Response 201:**
```json
{
  "message": "Registration successful.",
  "user": {"id": "uuid", "email": "alice@example.com", "role": "user"}
}
```

---

### POST /auth/login
Authenticate and receive JWT tokens.

**Rate limit:** 10 requests/minute per IP

**Request:**
```json
{
  "email": "alice@example.com",
  "password": "SecurePass1!"
}
```

**Response 200:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "alice@example.com",
    "full_name": "Alice Chen",
    "role": "user"
  }
}
```

---

### POST /auth/forgot-password
Request password reset OTP. Always returns 200 regardless of whether email exists (prevents enumeration).

**Request:**
```json
{"email": "alice@example.com"}
```

**Response 200:**
```json
{"message": "If this email exists, a reset code has been sent."}
```

---

### POST /auth/reset-password
Reset password using OTP.

**Request:**
```json
{
  "email": "alice@example.com",
  "otp": "654321",
  "new_password": "NewSecurePass1!",
  "confirm_password": "NewSecurePass1!"
}
```

**Response 200:**
```json
{"message": "Password reset successfully."}
```

---

### POST /auth/logout
Logout and audit log the action.

**Headers:** Authorization required.

**Response 200:**
```json
{"message": "Logged out successfully."}
```

---

### GET /auth/me
Get current user info.

**Response 200:**
```json
{
  "id": "uuid",
  "email": "alice@example.com",
  "full_name": "Alice Chen",
  "phone": "+1-555-0101",
  "role": "user",
  "is_active": true,
  "created_at": "2024-01-15T10:00:00Z",
  "last_login": "2024-01-20T14:30:00Z"
}
```

---

## Dashboard Endpoints

### GET /dashboard/stats
Get dashboard statistics for the authenticated user.

**Response 200:**
```json
{
  "total_threats": 284,
  "critical_threats": 12,
  "active_devices": 5,
  "blocked_ips": 8,
  "threats_today": 42,
  "threats_this_week": 198,
  "detection_accuracy": 0.9642,
  "recent_threats": [...],
  "threat_distribution": {"PORT_SCAN": 45, "BRUTE_FORCE": 30, ...},
  "severity_distribution": {"CRITICAL": 12, "HIGH": 68, "MEDIUM": 124, "LOW": 80},
  "top_attacking_ips": [{"ip": "185.x.x.x", "count": 15, "severity": "HIGH"}, ...]
}
```

---

## Threat Endpoints

### GET /threats
Get paginated, filtered list of threats.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | int | Page number (default: 1) |
| page_size | int | Items per page (default: 20, max: 100) |
| severity | string | Filter: LOW/MEDIUM/HIGH/CRITICAL |
| threat_type | string | Filter by threat type |
| source_ip | string | Filter by source IP |
| device_id | UUID | Filter by device |
| date_from | datetime | Start of date range |
| date_to | datetime | End of date range |
| search | string | Search in IPs, threat type |
| sort_by | string | Field to sort by (default: created_at) |
| sort_order | string | asc/desc (default: desc) |
| status | string | active/investigating/resolved/false_positive |

**Response 200:**
```json
{
  "items": [
    {
      "id": "uuid",
      "threat_type": "PORT_SCAN",
      "severity": "MEDIUM",
      "risk_score": 55.4,
      "confidence": 0.87,
      "source_ip": "185.220.101.34",
      "destination_ip": "192.168.1.10",
      "source_port": 54321,
      "destination_port": 22,
      "protocol": "TCP",
      "device_id": "uuid",
      "device_name": "Web-Server-01",
      "ml_model": "RandomForest",
      "detection_reason": "Multiple connection attempts to port 22 detected...",
      "recommended_action": "Review firewall rules and enable fail2ban...",
      "status": "active",
      "created_at": "2024-01-20T14:30:00Z"
    }
  ],
  "total": 284,
  "page": 1,
  "page_size": 20,
  "pages": 15
}
```

---

### GET /threats/{id}
Get single threat details.

### PATCH /threats/{id}/status
Update threat status.

**Request:**
```json
{"status": "investigating"}
```

---

### POST /threats/analyze
Submit a network event for ML analysis.

**Request:**
```json
{
  "source_ip": "185.220.101.34",
  "destination_ip": "192.168.1.10",
  "source_port": 54321,
  "destination_port": 22,
  "protocol": "TCP",
  "bytes_sent": 1024,
  "bytes_received": 512,
  "duration_ms": 250.5,
  "flags": "SYN",
  "device_id": "uuid (optional)"
}
```

**Response 200:**
```json
{
  "threat_type": "BRUTE_FORCE",
  "severity": "HIGH",
  "risk_score": 78.3,
  "confidence": 0.91,
  "detection_reason": "...",
  "recommended_action": "...",
  "threat_id": "uuid"
}
```

---

## Analytics Endpoints

### GET /analytics/threat-trends
**Query:** `period=24h|7d|30d`

**Response 200:**
```json
{
  "period": "7d",
  "data": [
    {"timestamp": "2024-01-14T00:00:00Z", "count": 45, "critical": 2, "high": 12, "medium": 20, "low": 11},
    ...
  ]
}
```

### GET /analytics/threat-distribution
### GET /analytics/severity-distribution
### GET /analytics/top-ips
### GET /analytics/top-devices

### GET /analytics/ml-metrics
```json
{
  "model_name": "Random Forest + Isolation Forest",
  "model_version": "1.0.0",
  "trained_at": "2024-01-20T10:00:00Z",
  "accuracy": 0.9642,
  "precision": 0.9631,
  "recall": 0.9642,
  "f1_score": 0.9634,
  "num_classes": 14,
  "training_samples": 70000
}
```

---

## GeoMap Endpoints

### GET /geo/threats
Get threat source IPs with geolocation for map display.

**Query Parameters:** `severity`, `threat_type`

**Response 200:**
```json
[
  {
    "ip": "185.220.101.34",
    "country": "Germany",
    "country_code": "DE",
    "region": "Bavaria",
    "city": "Munich",
    "lat": 48.1351,
    "lon": 11.5820,
    "isp": "AS4766 KOREAINNET",
    "threat_count": 15,
    "severity_counts": {"CRITICAL": 2, "HIGH": 8, "MEDIUM": 5},
    "threat_types": ["PORT_SCAN", "BRUTE_FORCE"],
    "last_seen": "2024-01-20T14:30:00Z"
  }
]
```

---

## Notification Endpoints

### GET /notifications
**Query:** `is_read=true|false`, `page`, `page_size`

### PATCH /notifications/{id}/read
### POST /notifications/read-all
### GET /notifications/unread-count
### DELETE /notifications/{id}

---

## Blocked IP Endpoints

### GET /blocked-ips
**Query:** `page`, `page_size`, `search`, `is_active`

### POST /blocked-ips
```json
{
  "ip_address": "185.220.101.34",
  "reason": "Multiple brute force attempts",
  "threat_type": "BRUTE_FORCE"
}
```

### DELETE /blocked-ips/{id}
Unblocks the IP (sets is_active=false).

### GET /blocked-ips/check/{ip}
```json
{"ip": "185.220.101.34", "is_blocked": true, "reason": "..."}
```

---

## WebSocket

### WS /ws/{token}
Connect with JWT access token in the URL path.

**Messages received from server:**
```json
{
  "type": "threat_detected",
  "data": {
    "id": "uuid",
    "threat_type": "DDOS",
    "severity": "CRITICAL",
    "risk_score": 94.2,
    "source_ip": "103.x.x.x",
    "destination_ip": "192.168.1.10",
    "created_at": "2024-01-20T14:30:00Z"
  }
}
```

```json
{
  "type": "notification",
  "data": {
    "id": "uuid",
    "title": "Critical Threat Detected",
    "message": "Possible DDoS attack from 103.x.x.x",
    "severity": "CRITICAL"
  }
}
```

```json
{"type": "ping"}
```

**Messages sent to server:**
```json
{"type": "pong"}
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (accessing another user's data) |
| 404 | Not Found |
| 409 | Conflict (e.g., email already registered) |
| 422 | Unprocessable Entity (schema validation error) |
| 429 | Too Many Requests (rate limit) |
| 500 | Internal Server Error |

All errors return:
```json
{"detail": "Human-readable error message"}
```
