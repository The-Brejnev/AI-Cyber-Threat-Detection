from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

class NotificationResponse(BaseModel):
    id: uuid.UUID
    title: str
    message: str
    notification_type: str
    severity: Optional[str] = None
    threat_id: Optional[uuid.UUID] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
