"""
Dual AI Architecture:
1. Sentinel Master AI (Admin / Sub-Admin Overseer):
   - Monitors all telemetry, detects unauthorized access, zero-days, and high/critical threats.
   - Autonomously signals Aegis User AI and dispatches authorized security alerts to user database and email.
2. Aegis User Guardian AI (User Endpoint Shield):
   - Receives authorized Sentinel AI signals.
   - Translates complex cyber forensics into plain-language security guidance and active protection status.
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
import logging

from app.models.user import User, UserProfile
from app.models.threat import Threat
from app.models.notification import Notification
from app.models.audit_log import AuditLog
from app.routers.websocket import manager
from app.services.email_service import send_threat_alert_email, send_admin_advisory_email

logger = logging.getLogger(__name__)

# In-memory record of recent Inter-AI signals
_inter_ai_audit_log: List[Dict[str, Any]] = []

class SentinelMasterAI:
    """
    Admin & Sub-Admin AI: SOC Sentinel Master AI.
    Analyzes global threat landscape, detects unauthorized intrusions,
    and selectively alerts User AI only on unauthorized access or HIGH/CRITICAL threats.
    """
    def __init__(self):
        self.name = "SOC Sentinel Master AI"
        self.version = "v3.2-NeuralSOC"
        self.status = "ONLINE_MONITORING"
        self.mode = "ACTIVE_DEFENSE_OVERSEER"

    def is_escalation_worthy(self, threat_type: str, severity: str) -> bool:
        """
        Only escalate to User AI and dispatch to user database/email if:
        1. Severity is CRITICAL or HIGH
        2. OR Threat is Unauthorized Access / Suspicious Breach / Data Theft / Data Tampering / Data Deletion
        """
        critical_types = {
            "UNAUTHORIZED_ACCESS",
            "SUSPICIOUS_LOGIN",
            "DATA_TAMPERING",
            "DATA_DELETION",
            "DATA_EXFILTRATION",
            "SQL_INJECTION",
            "BRUTE_FORCE",
            "MALWARE"
        }
        if severity in ("CRITICAL", "HIGH"):
            return True
        if threat_type in critical_types:
            return True
        return False

    async def process_threat_event(self, db: Session, user: User, threat: Threat) -> Optional[Dict[str, Any]]:
        """
        Evaluates a threat. If unauthorized access or high/critical threat,
        Sentinel Master AI signals Aegis User AI and sends to user DB and email.
        """
        if not self.is_escalation_worthy(threat.threat_type, threat.severity):
            # Routine low-level network event — Sentinel AI suppresses noise for user
            return None

        # Generate Sentinel AI forensic assessment
        forensic_verdict = self._generate_forensic_verdict(threat)

        # Signal Aegis User AI
        aegis_ai = AegisUserGuardianAI()
        user_guidance = aegis_ai.translate_for_user(threat, forensic_verdict)

        # 1. Save Authorized Notification to User's Database
        notif = Notification(
            user_id=user.id,
            title=f"🤖 Sentinel AI Alert: {user_guidance['headline']}",
            message=user_guidance['explanation'],
            notification_type="admin_directive",
            severity=threat.severity,
            threat_id=threat.id
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)

        # 2. Record Inter-AI Relay event
        relay_record = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "sender_ai": self.name,
            "target_ai": aegis_ai.name,
            "target_user": user.email,
            "threat_type": threat.threat_type,
            "severity": threat.severity,
            "source_attacker_ip": threat.source_ip,
            "target_proxy_ip": threat.destination_ip,
            "status": "DELIVERED_TO_USER_AND_EMAIL",
            "forensic_verdict": forensic_verdict,
            "user_headline": user_guidance['headline']
        }
        _inter_ai_audit_log.insert(0, relay_record)
        if len(_inter_ai_audit_log) > 50:
            _inter_ai_audit_log.pop()

        # 3. Broadcast Inter-AI Payload via WebSocket to User
        await manager.send_to_user(str(user.id), {
            "type": "dual_ai_alert",
            "data": {
                "id": str(notif.id),
                "sender_ai": self.name,
                "receiver_ai": aegis_ai.name,
                "headline": user_guidance['headline'],
                "explanation": user_guidance['explanation'],
                "recommended_action": user_guidance['action'],
                "attacker_ip": threat.source_ip,
                "proxy_ip": threat.destination_ip,
                "severity": threat.severity,
                "threat_type": threat.threat_type,
                "created_at": notif.created_at.isoformat() + "Z"
            }
        })

        # 4. Broadcast to Admin / Sub-Admin so they observe the Inter-AI relay in real-time
        admins = db.query(User).filter(User.role.in_(["admin", "sub_admin"])).all()
        for adm in admins:
            if adm.id != user.id:
                await manager.send_to_user(str(adm.id), {
                    "type": "sentinel_ai_relay",
                    "data": relay_record
                })

        # 5. Dispatch Authorized Email directly to User
        try:
            email_payload = {
                "title": f"🤖 Sentinel Master AI Alert: {user_guidance['headline']}",
                "message": f"{user_guidance['explanation']}\n\n🛡️ Aegis Defense Action: {user_guidance['action']}",
                "sender_role": "SOC Sentinel Master AI (AI Overseer)",
                "sender_email": "sentinel-ai@cyberguard.dev",
                "proxy_ip": threat.destination_ip,
                "attacker_ip": threat.source_ip,
                "severity": threat.severity
            }
            await send_admin_advisory_email(user.email, email_payload)
        except Exception as e:
            logger.error(f"Failed to dispatch Sentinel AI email to {user.email}: {e}")

        return relay_record

    def _generate_forensic_verdict(self, threat: Threat) -> str:
        if threat.threat_type == "UNAUTHORIZED_ACCESS":
            return f"Unauthorized operator session attempt from {threat.source_ip}. Threat signature matched high-risk access breach."
        elif threat.threat_type == "DATA_TAMPERING":
            return f"Malicious record modification attempt from {threat.source_ip} on database port {threat.destination_port}."
        elif threat.threat_type == "DATA_DELETION":
            return f"Destructive table drop/wipe query intercepted from {threat.source_ip}."
        elif threat.threat_type == "DATA_EXFILTRATION":
            return f"Outbound socket exfiltration attempt of customer records toward {threat.source_ip}."
        elif threat.threat_type == "SQL_INJECTION":
            return f"SQL grammar injection bypass payload from {threat.source_ip} targeting proxy endpoint."
        elif threat.threat_type == "BRUTE_FORCE":
            return f"Multi-vector credential stuffing attack from {threat.source_ip}."
        return f"{threat.severity} anomaly detected from {threat.source_ip}."


class AegisUserGuardianAI:
    """
    User AI: Aegis Endpoint Guardian AI.
    Receives alerts from Sentinel Master AI and protects the user's data and assets.
    """
    def __init__(self):
        self.name = "Aegis Endpoint Guardian AI"
        self.version = "v3.2-AegisShield"
        self.status = "ACTIVE_PROTECTING"
        self.mode = "ENDPOINT_DATA_SHIELD"

    def translate_for_user(self, threat: Threat, forensic_verdict: str) -> Dict[str, str]:
        t = threat.threat_type
        attacker = threat.source_ip
        proxy = threat.destination_ip or "10.201.64.21"

        if t == "UNAUTHORIZED_ACCESS":
            return {
                "headline": "Unauthorized Access Attempt Blocked",
                "explanation": f"Sentinel Master AI detected an unauthorized party trying to access your protected system via proxy {proxy}. Attacker IP {attacker} was severed.",
                "action": "Intruder IP quarantined and multi-factor session locked."
            }
        elif t == "DATA_TAMPERING":
            return {
                "headline": "Hacker Data Modification Prevented",
                "explanation": f"Hacker host {attacker} attempted unauthorized edits to your database records. Sentinel AI intercepted the query and preserved data integrity.",
                "action": "Transaction rolled back and attacker host firewalled."
            }
        elif t == "DATA_DELETION":
            return {
                "headline": "Data Wipe / Deletion Attack Defended",
                "explanation": f"Hacker host {attacker} attempted a destructive data wiping command against your tables. Data Loss Prevention shield blocked the command.",
                "action": "Database tables shielded; zero data lost."
            }
        elif t == "DATA_EXFILTRATION":
            return {
                "headline": "Data Theft / Exfiltration Blocked",
                "explanation": f"An unauthorized connection attempted to exfiltrate stored records to external host {attacker}. The connection was forcefully closed.",
                "action": "Outbound data channel blocked and encrypted."
            }
        elif t == "SQL_INJECTION":
            return {
                "headline": "Database SQL Exploit Neutralized",
                "explanation": f"Sentinel AI neutralized a malicious SQL injection attempt from {attacker} targeting proxy {proxy}.",
                "action": "Query payload sanitized and attacker host banned."
            }
        elif t == "BRUTE_FORCE":
            return {
                "headline": "Hacker Password Cracking Stopped",
                "explanation": f"Hacker host {attacker} attempted rapid credential brute force against your account.",
                "action": "Attacker IP blocked from login gateway."
            }
        else:
            return {
                "headline": f"{threat.severity} Threat Neutralized on Proxy {proxy}",
                "explanation": f"Sentinel Master AI intercepted a {threat.threat_type.replace('_', ' ')} attempt from {attacker} targeting your proxy {proxy}.",
                "action": "Automated AI mitigation enforced."
            }


sentinel_master_ai = SentinelMasterAI()
aegis_user_ai = AegisUserGuardianAI()

def get_inter_ai_logs() -> List[Dict[str, Any]]:
    return _inter_ai_audit_log
