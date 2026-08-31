from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

class NetworkEventRequest(BaseModel):
    source_ip: str
    destination_ip: str
    source_port: int
    destination_port: int
    protocol: str
    bytes_sent: int
    bytes_received: int
    duration_ms: float
    flags: Optional[str] = None
    device_id: Optional[uuid.UUID] = None

class ThreatResponse(BaseModel):
    id: uuid.UUID
    threat_type: str
    severity: str
    risk_score: float
    confidence: float
    source_ip: str
    destination_ip: str
    source_port: int
    destination_port: int
    protocol: str
    device_id: Optional[uuid.UUID] = None
    ml_model: str
    detection_reason: str
    recommended_action: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ThreatUpdate(BaseModel):
    status: str
