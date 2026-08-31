from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime

class AnalyticsSummary(BaseModel):
    total_threats: int
    critical_threats: int
    active_devices: int
    blocked_ips: int
    threats_today: int
    threats_this_week: int
    detection_accuracy: float

class ThreatTrend(BaseModel):
    timestamp: str
    count: int

class TopIP(BaseModel):
    ip: str
    count: int
