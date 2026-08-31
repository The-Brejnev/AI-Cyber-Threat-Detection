"""
AI Active Defense & Auto-Blocking Service.
Automates real-time firewall mitigation, threat neutralization, and audit logging.
"""
from datetime import datetime
import logging
from sqlalchemy.orm import Session
from app.models.user import User, UserSettings
from app.models.threat import Threat
from app.models.audit_log import BlockedIp, AuditLog
from app.models.notification import Notification
from app.routers.websocket import manager

logger = logging.getLogger(__name__)

async def evaluate_auto_block(db: Session, user: User, threat: Threat) -> bool:
    """
    Evaluates an incoming threat against user auto-blocking rules.
    If the threat exceeds severity or risk thresholds, instantly enforces a firewall block.
    """
    try:
        # Load user settings
        settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
        if not settings:
            return False

        auto_block_enabled = getattr(settings, "auto_block_enabled", True)
        if not auto_block_enabled:
            return False

        min_severity = getattr(settings, "auto_block_severity", "CRITICAL").upper()
        risk_threshold = getattr(settings, "auto_block_threshold", 80)

        # Severity eligibility
        is_severity_match = False
        if min_severity == "CRITICAL":
            is_severity_match = threat.severity == "CRITICAL"
        elif min_severity == "HIGH":
            is_severity_match = threat.severity in ("CRITICAL", "HIGH")
        else:
            is_severity_match = threat.severity in ("CRITICAL", "HIGH", "MEDIUM")

        # Risk score eligibility (0-100 scale)
        threat_risk = threat.risk_score if threat.risk_score > 1 else threat.risk_score * 100
        is_risk_match = threat_risk >= risk_threshold

        if not (is_severity_match or is_risk_match):
            return False

        # Check if source IP is already blocked
        existing = (
            db.query(BlockedIp)
            .filter(
                BlockedIp.user_id == user.id,
                BlockedIp.ip_address == threat.source_ip,
                BlockedIp.is_active == True
            )
            .first()
        )
        if existing:
            return True

        # Enforce automated firewall block
        reason = f"AI Auto-Defense: Neutralized {threat.threat_type} (Severity: {threat.severity}, Risk: {round(threat_risk, 1)}%)"
        new_block = BlockedIp(
            user_id=user.id,
            ip_address=threat.source_ip,
            reason=reason,
            threat_type=threat.threat_type,
            blocked_at=datetime.utcnow(),
            is_active=True,
            blocked_by="AI Auto-Defense Engine"
        )
        db.add(new_block)

        # Create audit log
        audit = AuditLog(
            user_id=user.id,
            action="ai_auto_block",
            resource_type="firewall",
            resource_id=threat.source_ip,
            ip_address=threat.source_ip,
            status="success",
            details={
                "threat_type": threat.threat_type,
                "severity": threat.severity,
                "risk_score": threat.risk_score,
                "trigger": "Automated ML intrusion mitigation"
            }
        )
        db.add(audit)

        # Create in-app high-priority notification
        notif = Notification(
            user_id=user.id,
            title="🛡️ AI Auto-Block Enforced",
            message=f"Malicious IP {threat.source_ip} was automatically blocked after executing {threat.threat_type} ({threat.severity}).",
            notification_type="threat",
            severity=threat.severity,
            threat_id=threat.id,
            is_read=False
        )
        db.add(notif)
        db.commit()

        # Broadcast live auto-block event via WebSocket
        block_payload = {
            "type": "auto_blocked",
            "data": {
                "ip_address": threat.source_ip,
                "threat_type": threat.threat_type,
                "severity": threat.severity,
                "reason": reason,
                "blocked_at": datetime.utcnow().isoformat() + "Z"
            }
        }
        await manager.send_to_user(str(user.id), block_payload)
        logger.info(f"AI Auto-Block successfully enforced on {threat.source_ip} for user {user.email}")
        return True

    except Exception as e:
        logger.error(f"Error executing auto-block for {threat.source_ip}: {e}")
        db.rollback()
        return False
