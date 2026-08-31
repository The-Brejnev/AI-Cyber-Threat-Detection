"""
Database Seeding Script for CyberGuard AI
Creates test users (Alice and Bob) with devices, settings, initial network profile,
historical threat records across 14 categories, and blocked IPs.
"""
from datetime import datetime, timedelta
import random
from app.database import SessionLocal, Base, engine
from app.models.user import User, UserProfile, UserSettings
from app.models.device import Device
from app.models.threat import Threat, NetworkEvent
from app.models.audit_log import BlockedIp, AuditLog
from app.security.password import hash_password

SAMPLE_ATTACKERS = [
    ("45.33.32.156", "PORT_SCAN", "HIGH", 78.5, 0.82),
    ("185.220.101.5", "BRUTE_FORCE", "CRITICAL", 94.2, 0.96),
    ("103.203.57.18", "DDOS", "CRITICAL", 96.8, 0.98),
    ("91.240.118.172", "MALWARE", "HIGH", 82.4, 0.85),
    ("179.43.155.22", "SQL_INJECTION", "HIGH", 76.0, 0.79),
    ("194.26.29.112", "BOTNET", "CRITICAL", 89.1, 0.91),
    ("80.82.77.139", "XSS", "MEDIUM", 62.3, 0.65),
    ("198.199.120.45", "DATA_EXFILTRATION", "CRITICAL", 92.5, 0.94),
    ("209.141.55.228", "RECONNAISSANCE", "LOW", 38.0, 0.42),
    ("185.156.73.44", "UNAUTHORIZED_ACCESS", "HIGH", 84.0, 0.88),
]

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Seed Alice
        alice = db.query(User).filter(User.email == "alice@cyberguard.dev").first()
        if not alice:
            alice = User(
                email="alice@cyberguard.dev",
                hashed_password=hash_password("Test1234!"),
                is_active=True,
                is_verified=True,
                role="admin"
            )
            db.add(alice)
            db.flush()

            alice_prof = UserProfile(
                user_id=alice.id,
                full_name="Alice Vance (SOC Lead)",
                phone="+1-555-0199",
                timezone="UTC"
            )
            alice_sett = UserSettings(
                user_id=alice.id,
                email_notifications=True,
                sms_notifications=False,
                critical_alerts=True,
                high_alerts=True,
                medium_alerts=True,
                low_alerts=False,
                dashboard_refresh=15,
                theme="dark"
            )
            db.add_all([alice_prof, alice_sett])

            dev1 = Device(user_id=alice.id, name="Primary Gateway Router", ip_address="192.168.1.1", device_type="router", status="active")
            dev2 = Device(user_id=alice.id, name="SOC Workstation Alpha", ip_address="192.168.1.105", device_type="workstation", status="active")
            dev3 = Device(user_id=alice.id, name="Database Server Prod", ip_address="10.0.0.12", device_type="server", status="active")
            db.add_all([dev1, dev2, dev3])
            db.flush()
            print("Seeded Alice (alice@cyberguard.dev / Test1234!)")

        # 2. Seed Bob
        bob = db.query(User).filter(User.email == "bob@cyberguard.dev").first()
        if not bob:
            bob = User(
                email="bob@cyberguard.dev",
                hashed_password=hash_password("Test1234!"),
                is_active=True,
                is_verified=True,
                role="user"
            )
            db.add(bob)
            db.flush()

            bob_prof = UserProfile(
                user_id=bob.id,
                full_name="Bob Builder (Analyst)",
                phone="+1-555-0248",
                timezone="UTC"
            )
            bob_sett = UserSettings(
                user_id=bob.id,
                email_notifications=True,
                sms_notifications=False,
                critical_alerts=True,
                high_alerts=True,
                medium_alerts=False,
                low_alerts=False,
                dashboard_refresh=30,
                theme="dark"
            )
            db.add_all([bob_prof, bob_sett])

            dev_b1 = Device(user_id=bob.id, name="Analyst Laptop", ip_address="192.168.1.210", device_type="workstation", status="active")
            db.add(dev_b1)
            db.flush()
            print("Seeded Bob (bob@cyberguard.dev / Test1234!)")

        # 3. Seed historical threats for Alice if count is low
        all_users = db.query(User).all()
        now = datetime.utcnow()

        for u in all_users:
            threat_count = db.query(Threat).filter(Threat.user_id == u.id).count()
            if threat_count < 15:
                print(f"Seeding historical threats and telemetry for {u.email}...")
                # Generate ~25 distributed threats over past 30 days
                for i in range(25):
                    days_ago = random.uniform(0.1, 28)
                    event_time = now - timedelta(days=days_ago)
                    attacker = random.choice(SAMPLE_ATTACKERS)
                    ip, ttype, sev, rscore, conf = attacker
                    
                    dst_ip = "192.168.1.105" if i % 2 == 0 else "10.0.0.12"
                    src_port = random.randint(1024, 65535)
                    dst_port = 22 if ttype == "BRUTE_FORCE" else (80 if ttype == "DDOS" else 3306)

                    ne = NetworkEvent(
                        user_id=u.id,
                        source_ip=ip,
                        destination_ip=dst_ip,
                        source_port=src_port,
                        destination_port=dst_port,
                        protocol="TCP" if ttype != "DDOS" else "UDP",
                        bytes_sent=random.randint(100, 15000),
                        bytes_received=random.randint(50, 5000),
                        duration_ms=random.uniform(5.0, 500.0),
                        flags="SYN" if ttype in ("PORT_SCAN", "BRUTE_FORCE") else "ACK",
                        created_at=event_time
                    )
                    db.add(ne)
                    db.flush()

                    t = Threat(
                        user_id=u.id,
                        network_event_id=ne.id,
                        threat_type=ttype,
                        severity=sev,
                        risk_score=rscore + random.uniform(-3, 3),
                        confidence=conf,
                        source_ip=ip,
                        destination_ip=dst_ip,
                        source_port=src_port,
                        destination_port=dst_port,
                        protocol=ne.protocol,
                        ml_model="Random Forest + Isolation Forest",
                        detection_reason=f"AI model identified traffic pattern consistent with {ttype} signatures and high byte asymmetry",
                        recommended_action=f"Enforce immediate firewall block on source IP {ip} and isolate port {dst_port}",
                        status="active" if i < 10 else "resolved",
                        created_at=event_time,
                        updated_at=event_time
                    )
                    db.add(t)

            # 4. Seed initial blocked IPs if count is 0
            blocked_count = db.query(BlockedIp).filter(BlockedIp.user_id == u.id).count()
            if blocked_count == 0:
                print(f"Seeding initial blocked IPs for {u.email}...")
                b1 = BlockedIp(
                    user_id=u.id,
                    ip_address="185.220.101.5",
                    reason="Automated Brute Force credential stuffing against SSH port 22",
                    threat_type="BRUTE_FORCE",
                    blocked_at=now - timedelta(days=2),
                    is_active=True,
                    blocked_by="SOC Lead"
                )
                b2 = BlockedIp(
                    user_id=u.id,
                    ip_address="103.203.57.18",
                    reason="Volumetric UDP flood targeting public gateway web services",
                    threat_type="DDOS",
                    blocked_at=now - timedelta(days=5),
                    is_active=True,
                    blocked_by="AI Rule Engine"
                )
                b3 = BlockedIp(
                    user_id=u.id,
                    ip_address="45.33.32.156",
                    reason="Rapid multi-port reconnaissance probe across subnets",
                    threat_type="PORT_SCAN",
                    blocked_at=now - timedelta(days=7),
                    is_active=False,
                    unblocked_at=now - timedelta(days=1),
                    blocked_by="Analyst"
                )
                db.add_all([b1, b2, b3])

        db.commit()
        print("Database seeding completed successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
