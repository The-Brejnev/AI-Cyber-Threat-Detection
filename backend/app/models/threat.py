import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Float, Integer, ForeignKey
from app.database import Base
from app.models.types import GUID, JSONType

class NetworkEvent(Base):
    __tablename__ = "network_events"
    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    device_id = Column(GUID, ForeignKey("devices.id", ondelete="SET NULL"), nullable=True)
    source_ip = Column(String, nullable=False)
    destination_ip = Column(String, nullable=False)
    source_port = Column(Integer, nullable=False)
    destination_port = Column(Integer, nullable=False)
    protocol = Column(String, nullable=False)
    bytes_sent = Column(Integer, nullable=False)
    bytes_received = Column(Integer, nullable=False)
    duration_ms = Column(Float, nullable=False)
    flags = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Threat(Base):
    __tablename__ = "threats"
    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    network_event_id = Column(GUID, ForeignKey("network_events.id", ondelete="SET NULL"), nullable=True)
    threat_type = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    risk_score = Column(Float, nullable=False)
    confidence = Column(Float, nullable=False)
    source_ip = Column(String, nullable=False)
    destination_ip = Column(String, nullable=False)
    source_port = Column(Integer, nullable=False)
    destination_port = Column(Integer, nullable=False)
    protocol = Column(String, nullable=False)
    device_id = Column(GUID, ForeignKey("devices.id", ondelete="SET NULL"), nullable=True)
    ml_model = Column(String, nullable=False)
    detection_reason = Column(String, nullable=False)
    recommended_action = Column(String, nullable=False)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ThreatPrediction(Base):
    __tablename__ = "threat_predictions"
    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    network_event_id = Column(GUID, ForeignKey("network_events.id", ondelete="CASCADE"), nullable=False)
    threat_id = Column(GUID, ForeignKey("threats.id", ondelete="SET NULL"), nullable=True)
    raw_prediction = Column(JSONType, nullable=False)
    features_used = Column(JSONType, nullable=False)
    model_version = Column(String, nullable=False)
    prediction_time_ms = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
