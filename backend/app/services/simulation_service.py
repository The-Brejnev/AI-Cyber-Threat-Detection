import asyncio
import random
from sqlalchemy.orm import Session
from app.config import settings
from app.models.threat import NetworkEvent, Threat
from app.models.user import User, UserProfile
from app.ml.model import get_predictor
from app.routers.websocket import manager
from app.services.notification_service import send_threat_notification
from app.services.defense_service import evaluate_auto_block
from app.utils.ip_utils import get_real_system_telemetry
import logging

logger = logging.getLogger(__name__)

class SimulationService:
    def __init__(self):
        self.running = False
        self.predictor = get_predictor()
        self.system_telemetry = get_real_system_telemetry()
        
    def generate_random_ip(self, is_public=True):
        if is_public:
            return f"{random.choice([45, 185, 103, 91, 179, 194, 80, 198, 209, 142, 62])}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(0,255)}"
        else:
            return self.system_telemetry.get("local_ip", "10.201.64.21")

    def generate_event(self):
        is_threat = random.random() < 0.40
        dest_ip = self.system_telemetry.get("local_ip", "10.201.64.21")
        
        if is_threat:
            threat_scenario = random.choice([
                "DATA_TAMPERING",
                "DATA_DELETION",
                "DATA_EXFILTRATION",
                "SQL_INJECTION",
                "BRUTE_FORCE",
                "PORT_SCAN",
                "DDOS"
            ])
            
            if threat_scenario == "DATA_TAMPERING":
                # Hacker trying to modify / edit database records
                return {
                    "source_ip": self.generate_random_ip(True),
                    "destination_ip": dest_ip,
                    "source_port": random.randint(1024, 65535),
                    "destination_port": 3306,
                    "protocol": "TCP",
                    "bytes_sent": random.randint(2200, 4800),
                    "bytes_received": random.randint(100, 400),
                    "duration_ms": random.uniform(30.0, 180.0),
                    "flags": "PSH,ACK",
                    "event_type": "DATA_TAMPERING"
                }
            elif threat_scenario == "DATA_DELETION":
                # Hacker trying to wipe / clean data tables
                return {
                    "source_ip": self.generate_random_ip(True),
                    "destination_ip": dest_ip,
                    "source_port": random.randint(1024, 65535),
                    "destination_port": 5432,
                    "protocol": "TCP",
                    "bytes_sent": random.randint(1800, 3500),
                    "bytes_received": 0,
                    "duration_ms": random.uniform(15.0, 90.0),
                    "flags": "RST,ACK",
                    "event_type": "DATA_DELETION"
                }
            elif threat_scenario == "DATA_EXFILTRATION":
                # Hacker trying to steal data records
                return {
                    "source_ip": self.generate_random_ip(True),
                    "destination_ip": dest_ip,
                    "source_port": random.randint(1024, 65535),
                    "destination_port": 443,
                    "protocol": "TCP",
                    "bytes_sent": random.randint(45000, 95000),
                    "bytes_received": random.randint(500, 2000),
                    "duration_ms": random.uniform(200.0, 800.0),
                    "flags": "PSH,ACK",
                    "event_type": "DATA_EXFILTRATION"
                }
            elif threat_scenario == "SQL_INJECTION":
                # SQL query exploit attempting data tampering/extraction
                return {
                    "source_ip": self.generate_random_ip(True),
                    "destination_ip": dest_ip,
                    "source_port": random.randint(1024, 65535),
                    "destination_port": 3306,
                    "protocol": "TCP",
                    "bytes_sent": random.randint(400, 1500),
                    "bytes_received": random.randint(1000, 4000),
                    "duration_ms": random.uniform(25.0, 160.0),
                    "flags": "PSH,ACK"
                }
            elif threat_scenario == "PORT_SCAN":
                return {
                    "source_ip": self.generate_random_ip(True),
                    "destination_ip": dest_ip,
                    "source_port": random.randint(1024, 65535),
                    "destination_port": random.randint(20, 1024),
                    "protocol": "TCP",
                    "bytes_sent": random.randint(40, 120),
                    "bytes_received": 0,
                    "duration_ms": random.uniform(1.0, 8.0),
                    "flags": "SYN"
                }
            elif threat_scenario == "DDOS":
                return {
                    "source_ip": self.generate_random_ip(True),
                    "destination_ip": dest_ip,
                    "source_port": random.randint(1024, 65535),
                    "destination_port": 80,
                    "protocol": "UDP",
                    "bytes_sent": random.randint(16000, 60000),
                    "bytes_received": 0,
                    "duration_ms": random.uniform(10.0, 80.0)
                }
            else:
                return {
                    "source_ip": self.generate_random_ip(True),
                    "destination_ip": dest_ip,
                    "source_port": random.randint(1024, 65535),
                    "destination_port": 22,
                    "protocol": "TCP",
                    "bytes_sent": random.randint(100, 500),
                    "bytes_received": random.randint(100, 500),
                    "duration_ms": random.uniform(100.0, 500.0),
                    "flags": "SYN"
                }
        else:
            return {
                "source_ip": self.generate_random_ip(False) if random.random() < 0.3 else self.generate_random_ip(True),
                "destination_ip": dest_ip,
                "source_port": random.randint(1024, 65535),
                "destination_port": random.choice([80, 443, 53]),
                "protocol": random.choice(["TCP", "UDP"]),
                "bytes_sent": random.randint(100, 5000),
                "bytes_received": random.randint(100, 10000),
                "duration_ms": random.uniform(10.0, 1000.0),
                "flags": "ACK"
            }

    async def start(self, db_session_factory):
        self.running = True
        while self.running:
            await asyncio.sleep(settings.SIMULATION_INTERVAL_SECONDS)
            db = db_session_factory()
            try:
                users = db.query(User).filter(User.is_active == True).all()
                if not users:
                    continue
                    
                event_data = self.generate_event()
                # Clean internal key before saving NetworkEvent
                event_type_hint = event_data.pop("event_type", None)
                if event_type_hint:
                    event_data["event_type"] = event_type_hint
                    prediction = self.predictor.predict(event_data)
                    event_data.pop("event_type", None)
                else:
                    prediction = self.predictor.predict(event_data)
                
                # Fetch admins & sub-admins to notify them in real-time with user profiles
                admins_and_subadmins = [u for u in users if u.role in ("admin", "sub_admin")]

                for user in users:
                    net_event = NetworkEvent(
                        user_id=user.id,
                        **event_data
                    )
                    db.add(net_event)
                    db.commit()
                    db.refresh(net_event)
                    
                    if prediction.get("threat_type") != "NORMAL":
                        threat = Threat(
                            user_id=user.id,
                            network_event_id=net_event.id,
                            source_ip=net_event.source_ip,
                            destination_ip=net_event.destination_ip,
                            source_port=net_event.source_port,
                            destination_port=net_event.destination_port,
                            protocol=net_event.protocol,
                            threat_type=prediction["threat_type"],
                            severity=prediction["severity"],
                            risk_score=prediction["risk_score"],
                            confidence=prediction["confidence"],
                            ml_model=prediction["ml_model"],
                            detection_reason=prediction["detection_reason"],
                            recommended_action=prediction["recommended_action"]
                        )
                        db.add(threat)
                        db.commit()
                        db.refresh(threat)
                        
                        prof = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
                        user_name = prof.full_name if prof and prof.full_name else user.email.split('@')[0]

                        threat_dict = {
                            "id": str(threat.id),
                            "threat_type": threat.threat_type,
                            "severity": threat.severity,
                            "source_ip": threat.source_ip,
                            "destination_ip": threat.destination_ip,
                            "proxy_ip": threat.destination_ip,
                            "risk_score": threat.risk_score,
                            "detection_reason": threat.detection_reason,
                            "user_id": str(user.id),
                            "user_email": user.email,
                            "user_name": user_name,
                            "user_role": user.role
                        }
                        
                        # 1. Dispatch to targeted user
                        await manager.send_to_user(str(user.id), {"type": "threat", "data": threat_dict})
                        await send_threat_notification(db, user, threat)
                        
                        # 2. Dual AI Inter-Agent System: Sentinel Master AI evaluates & alerts Aegis User AI
                        from app.services.dual_ai_service import sentinel_master_ai
                        await sentinel_master_ai.process_threat_event(db, user, threat)

                        # 3. Concurrently update all Admins & Sub-Admins with the user's profile
                        if user.role == "user":
                            for adm in admins_and_subadmins:
                                if adm.id != user.id:
                                    await manager.send_to_user(str(adm.id), {
                                        "type": "user_threat_update",
                                        "data": threat_dict
                                    })
                        
                        # 4. AI Active Defense: Auto-block high-risk intruders
                        await evaluate_auto_block(db, user, threat)
                        
            except Exception as e:
                logger.error(f"Simulation error: {e}")
            finally:
                db.close()
                
    def stop(self):
        self.running = False

simulation_service = SimulationService()
