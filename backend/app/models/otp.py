import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Integer
from app.database import Base
from app.models.types import GUID

class OtpCode(Base):
    __tablename__ = "otp_codes"
    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    email = Column(String, nullable=False, index=True)
    hashed_otp = Column(String, nullable=False)
    purpose = Column(String, nullable=False) # registration, password_reset
    is_used = Column(Boolean, default=False)
    attempts = Column(Integer, default=0)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
