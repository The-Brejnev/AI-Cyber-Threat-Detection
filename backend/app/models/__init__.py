"""
Import all models here so SQLAlchemy sees them before Base.metadata.create_all()
"""
from app.models.user import User, UserProfile, UserSettings
from app.models.device import Device
from app.models.threat import NetworkEvent, Threat, ThreatPrediction
from app.models.notification import Notification
from app.models.otp import OtpCode
from app.models.scan import Scan
from app.models.audit_log import AuditLog, BlockedIp

__all__ = [
    "User", "UserProfile", "UserSettings",
    "Device",
    "NetworkEvent", "Threat", "ThreatPrediction",
    "Notification",
    "OtpCode",
    "Scan",
    "AuditLog", "BlockedIp",
]
