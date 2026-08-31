import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text
from app.database import Base
from app.models.types import GUID, JSONType

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(255), nullable=False)
    resource_type = Column(String(100), nullable=True)
    resource_id = Column(String(255), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="success")  # success | failure
    details = Column(JSONType, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class BlockedIp(Base):
    __tablename__ = "blocked_ips"
    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    ip_address = Column(String(45), nullable=False)
    reason = Column(Text, nullable=False)
    threat_type = Column(String(100), nullable=True)
    blocked_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    unblocked_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    blocked_by = Column(String(50), default="user", nullable=False)
