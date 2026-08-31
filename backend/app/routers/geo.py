"""
GeoMap Router — Threat Geolocation, Attack Vectors, and Global Telemetry.
High-speed parallel batch GeoIP resolution with User Real Host Destination anchoring.
"""
import asyncio
from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.threat import Threat
from app.models.device import Device
from app.services.geo_service import get_ip_info
from app.utils.ip_utils import is_private_ip, get_real_system_telemetry

router = APIRouter(prefix="/geo", tags=["geo"])


@router.get("/threats")
async def get_geo_threats(
    severity: Optional[str] = None,
    threat_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns unique threat source IPs with geolocation, attack counts,
    and attack trajectory vectors into the user's real host system coordinates.
    """
    uid = current_user.id

    # Retrieve real system telemetry (Real Public IP, Local IP, and Real Geolocation)
    telemetry = get_real_system_telemetry()
    primary_device = db.query(Device).filter(Device.user_id == uid).first()
    
    system_ip = telemetry.get("public_ip", "157.50.180.145")
    local_ip = telemetry.get("local_ip", "10.201.64.21")
    device_name = primary_device.name if primary_device else "Active Workstation"
    system_name = f"Your System ({telemetry.get('city', 'Local')}, {telemetry.get('country', 'IN')})"

    target_info = {
        "name": system_name,
        "ip_address": f"{system_ip} ({local_ip})",
        "public_ip": system_ip,
        "local_ip": local_ip,
        "device_type": primary_device.device_type if primary_device else "workstation",
        "city": telemetry.get("city", "Bengaluru"),
        "country": telemetry.get("country", "India"),
        "country_code": telemetry.get("country_code", "IN"),
        "lat": float(telemetry.get("lat", 12.9753)),
        "lon": float(telemetry.get("lon", 77.5910)),
        "isp": telemetry.get("isp", "Reliance Jio Infocomm")
    }

    query = db.query(
        Threat.source_ip,
        func.count(Threat.id).label("threat_count"),
        func.max(Threat.created_at).label("last_seen"),
        func.max(Threat.risk_score).label("max_risk"),
    ).filter(Threat.user_id == uid, Threat.threat_type != "NORMAL")

    if severity:
        query = query.filter(Threat.severity == severity.upper())
    if threat_type:
        query = query.filter(Threat.threat_type == threat_type.upper())

    query = query.group_by(Threat.source_ip).order_by(desc("threat_count")).limit(100)
    rows = query.all()

    public_rows = [r for r in rows if not is_private_ip(r.source_ip)]
    if not public_rows:
        return {
            "locations": [],
            "attacks": [],
            "countries": [],
            "target": target_info,
            "summary": {
                "total_mapped_ips": 0,
                "countries_count": 0,
                "top_country": "None",
                "active_threats_mapped": 0,
                "user_system_ip": target_info["ip_address"],
                "user_system_name": target_info["name"],
                "user_city": target_info["city"],
                "user_country": target_info["country"]
            }
        }

    # Parallel asynchronous GeoIP queries
    geo_results = await asyncio.gather(*[get_ip_info(r.source_ip) for r in public_rows])

    locations = []
    country_map: Dict[str, dict] = {}
    attacks = []

    for row, geo in zip(public_rows, geo_results):
        if not geo or geo.get("lat") is None:
            continue

        ip = row.source_ip

        # Severity breakdown
        sev_rows = (
            db.query(Threat.severity, func.count(Threat.id).label("cnt"))
            .filter(Threat.user_id == uid, Threat.source_ip == ip, Threat.threat_type != "NORMAL")
            .group_by(Threat.severity)
            .all()
        )
        severity_counts = {r.severity: r.cnt for r in sev_rows}

        # Threat types
        type_rows = (
            db.query(Threat.threat_type)
            .filter(Threat.user_id == uid, Threat.source_ip == ip, Threat.threat_type != "NORMAL")
            .distinct()
            .all()
        )
        threat_types = [r.threat_type for r in type_rows]

        worst = "LOW"
        for s in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
            if severity_counts.get(s, 0) > 0:
                worst = s
                break

        # Destination info for this attacker
        sample_threat = db.query(Threat).filter(Threat.user_id == uid, Threat.source_ip == ip).first()
        dest_ip = sample_threat.destination_ip if sample_threat else local_ip
        dest_port = sample_threat.destination_port if sample_threat else 22
        protocol = sample_threat.protocol if sample_threat else "TCP"

        item = {
            "ip": ip,
            "country": geo.get("country", "Unknown"),
            "country_code": geo.get("country_code", "UN"),
            "region": geo.get("region", ""),
            "city": geo.get("city", ""),
            "lat": float(geo["lat"]),
            "lon": float(geo["lon"]),
            "isp": geo.get("isp", "Autonomous Network"),
            "org": geo.get("org", "Transit AS"),
            "threat_count": row.threat_count,
            "max_risk": round(float(row.max_risk or 0), 1),
            "severity_counts": severity_counts,
            "worst_severity": worst,
            "threat_types": threat_types,
            "destination_ip": dest_ip,
            "destination_port": dest_port,
            "protocol": protocol,
            "last_seen": row.last_seen.isoformat() + "Z" if row.last_seen else None,
        }
        locations.append(item)

        c_name = item["country"]
        if c_name not in country_map:
            country_map[c_name] = {
                "country": c_name,
                "country_code": item["country_code"],
                "total_threats": 0,
                "unique_ips": 0,
                "worst_severity": worst
            }
        country_map[c_name]["total_threats"] += row.threat_count
        country_map[c_name]["unique_ips"] += 1

        attacks.append({
            "source": {
                "ip": ip,
                "lat": item["lat"],
                "lon": item["lon"],
                "city": item["city"],
                "country": item["country"],
                "isp": item["isp"]
            },
            "target": {
                **target_info,
                "destination_ip": dest_ip,
                "destination_port": dest_port,
                "protocol": protocol
            },
            "threat_type": threat_types[0] if threat_types else "ATTACK",
            "severity": worst,
            "count": row.threat_count
        })

    sorted_countries = sorted(country_map.values(), key=lambda x: x["total_threats"], reverse=True)

    return {
        "locations": locations,
        "attacks": attacks,
        "countries": sorted_countries,
        "target": target_info,
        "summary": {
            "total_mapped_ips": len(locations),
            "countries_count": len(country_map),
            "top_country": sorted_countries[0]["country"] if sorted_countries else "None",
            "active_threats_mapped": sum(l["threat_count"] for l in locations),
            "user_system_ip": target_info["ip_address"],
            "user_system_name": target_info["name"],
            "user_city": target_info["city"],
            "user_country": target_info["country"]
        }
    }


@router.get("/ip/{ip}")
async def get_single_ip_geo(
    ip: str,
    current_user: User = Depends(get_current_user)
):
    """Lookup geolocation info for a single IP address."""
    if is_private_ip(ip):
        return {"ip": ip, "message": "Private/local RFC1918 IP address — local internal network."}

    geo = await get_ip_info(ip)
    if not geo:
        return {"ip": ip, "message": "Geolocation lookup failed or IP not found."}

    return geo
