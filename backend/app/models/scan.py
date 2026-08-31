import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey
from app.database import Base
from app.models.types import GUID

class Scan(Base):
    __tablename__ = "scans"
    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    scan_type = Column(String, nullable=False) # network, vulnerability, port, full
    status = Column(String, default="pending") # pending, running, completed, failed
    target_ip = Column(String, nullable=True)
    total_events = Column(Integer, default=0)
    threats_found = Column(Integer, default=0)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
