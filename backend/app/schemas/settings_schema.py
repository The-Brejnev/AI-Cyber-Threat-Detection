from pydantic import BaseModel
from typing import Optional
import uuid

class SettingsUpdate(BaseModel):
    email_notifications: Optional[bool] = None
    sms_notifications: Optional[bool] = None
    critical_alerts: Optional[bool] = None
    high_alerts: Optional[bool] = None
    medium_alerts: Optional[bool] = None
    low_alerts: Optional[bool] = None
    dashboard_refresh: Optional[int] = None
    theme: Optional[str] = None
    auto_block_enabled: Optional[bool] = None
    auto_block_severity: Optional[str] = None
    auto_block_threshold: Optional[int] = None

class SettingsResponse(BaseModel):
    id: uuid.UUID
    email_notifications: bool
    sms_notifications: bool
    critical_alerts: bool
    high_alerts: bool
    medium_alerts: bool
    low_alerts: bool
    dashboard_refresh: int
    theme: str
    auto_block_enabled: bool = True
    auto_block_severity: str = "CRITICAL"
    auto_block_threshold: int = 80

    class Config:
        from_attributes = True
