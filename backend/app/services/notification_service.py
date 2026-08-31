import time
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.models.user import User
from app.models.threat import Threat

_last_email_sent_time = {}

def create_notification(db: Session, user_id: str, title: str, message: str, notification_type: str, severity: str, threat_id: str = None) -> Notification:
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        severity=severity,
        threat_id=threat_id
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif

async def send_threat_notification(db: Session, user: User, threat: Threat):
    settings = user.settings
    if not settings:
        return

    create_notification(
        db=db,
        user_id=user.id,
        title=f"New Threat Detected: {threat.threat_type}",
        message=f"Severity {threat.severity} threat detected from {threat.source_ip}",
        notification_type="threat",
        severity=threat.severity,
        threat_id=threat.id
    )

    should_email = False
    if settings.email_notifications:
        if threat.severity == "CRITICAL" and settings.critical_alerts:
            should_email = True
        elif threat.severity == "HIGH" and settings.high_alerts:
            should_email = True

    # Debounce automated simulated emails to max 1 per 10 minutes per user so Gmail SMTP quota is preserved for Admin Advisories & OTPs
    now = time.time()
    last_sent = _last_email_sent_time.get(str(user.id), 0)
    if should_email and (now - last_sent > 600):
        _last_email_sent_time[str(user.id)] = now
        from app.services.email_service import send_threat_alert_email
        try:
            await send_threat_alert_email(user.email, {
                "severity": threat.severity,
                "threat_type": threat.threat_type,
                "source_ip": threat.source_ip,
                "destination_ip": threat.destination_ip
            })
        except Exception:
            pass

def broadcast_threat(threat_data: dict):
    from app.routers.websocket import manager
    manager.broadcast_all(threat_data)
