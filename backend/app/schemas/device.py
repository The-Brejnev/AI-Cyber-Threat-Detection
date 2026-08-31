from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

class DeviceCreate(BaseModel):
    name: str
    ip_address: str
    mac_address: Optional[str] = None
    device_type: str
    os_type: Optional[str] = None

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    device_type: Optional[str] = None
    os_type: Optional[str] = None
    status: Optional[str] = None

class DeviceResponse(BaseModel):
    id: uuid.UUID
    name: str
    ip_address: str
    mac_address: Optional[str]
    device_type: str
    os_type: Optional[str]
    status: str
    last_seen: datetime
    created_at: datetime

    class Config:
        from_attributes = True
