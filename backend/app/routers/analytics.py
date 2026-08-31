"""
Complete analytics router with all chart data endpoints.
"""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.threat import Threat
from app.models.device import Device
from app.ml.model import get_predictor

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary")
def get_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    uid = current_user.id
    now = datetime.utcnow()
    total = db.query(func.count(Threat.id)).filter(Threat.user_id == uid).scalar() or 0
    critical = db.query(func.count(Threat.id)).filter(Threat.user_id == uid, Threat.severity == "CRITICAL").scalar() or 0
    high = db.query(func.count(Threat.id)).filter(Threat.user_id == uid, Threat.severity == "HIGH").scalar() or 0
    medium = db.query(func.count(Threat.id)).filter(Threat.user_id == uid, Threat.severity == "MEDIUM").scalar() or 0
    low = db.query(func.count(Threat.id)).filter(Threat.user_id == uid, Threat.severity == "LOW").scalar() or 0
    return {
        "total_threats": total,
        "critical": critical,
        "high": high,
        "medium": medium,
        "low": low,
    }


@router.get("/threat-trends")
def get_threat_trends(
    period: str = Query("7d", regex="^(24h|7d|30d)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns time-series threat counts for line chart."""
    uid = current_user.id
    now = datetime.utcnow()

    if period == "24h":
        start = now - timedelta(hours=24)
        bucket_hours = 1
    elif period == "7d":
        start = now - timedelta(days=7)
        bucket_hours = 6
    else:  # 30d
        start = now - timedelta(days=30)
        bucket_hours = 24

    # Generate time buckets
    buckets = []
    current = start
    while current <= now:
        bucket_end = current + timedelta(hours=bucket_hours)
        counts = {"timestamp": current.isoformat() + "Z", "total": 0, "critical": 0, "high": 0, "medium": 0, "low": 0}
        threats_in_bucket = (
            db.query(Threat)
            .filter(
                Threat.user_id == uid,
                Threat.created_at >= current,
                Threat.created_at < bucket_end,
            )
            .all()
        )
        for t in threats_in_bucket:
            counts["total"] += 1
            sev = t.severity.lower() if t.severity else "low"
            if sev in counts:
                counts[sev] += 1
        buckets.append(counts)
        current = bucket_end

    return {"period": period, "data": buckets}


@router.get("/threat-distribution")
def get_threat_distribution(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns threat type distribution for pie/donut chart."""
    uid = current_user.id
    rows = (
        db.query(Threat.threat_type, func.count(Threat.id).label("value"))
        .filter(Threat.user_id == uid, Threat.threat_type != "NORMAL")
        .group_by(Threat.threat_type)
        .order_by(desc("value"))
        .all()
    )
    return [{"name": row.threat_type, "value": row.value} for row in rows]


@router.get("/severity-distribution")
def get_severity_distribution(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns severity distribution for bar chart."""
    uid = current_user.id
    severity_order = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    result = []
    for sev in severity_order:
        count = db.query(func.count(Threat.id)).filter(
            Threat.user_id == uid, Threat.severity == sev
        ).scalar() or 0
        result.append({"name": sev, "value": count})
    return result


@router.get("/top-ips")
def get_top_ips(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns top attacking source IPs for horizontal bar chart."""
    uid = current_user.id
    rows = (
        db.query(Threat.source_ip, func.count(Threat.id).label("count"))
        .filter(Threat.user_id == uid, Threat.threat_type != "NORMAL")
        .group_by(Threat.source_ip)
        .order_by(desc("count"))
        .limit(limit)
        .all()
    )
    return [{"ip": row.source_ip, "count": row.count} for row in rows]


@router.get("/top-devices")
def get_top_devices(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns most targeted devices for bar chart."""
    uid = current_user.id
    # Query threats with device info
    rows = (
        db.query(Threat.destination_ip, func.count(Threat.id).label("count"))
        .filter(Threat.user_id == uid, Threat.threat_type != "NORMAL")
        .group_by(Threat.destination_ip)
        .order_by(desc("count"))
        .limit(limit)
        .all()
    )

    # Try to match with known devices
    devices = db.query(Device).filter(Device.user_id == uid).all()
    device_map = {d.ip_address: d.name for d in devices}

    return [
        {
            "ip": row.destination_ip,
            "name": device_map.get(row.destination_ip, row.destination_ip),
            "count": row.count,
        }
        for row in rows
    ]


@router.get("/ml-metrics")
def get_ml_metrics(current_user: User = Depends(get_current_user)):
    """Returns ML model performance metrics computed on real test data."""
    predictor = get_predictor()
    metrics = predictor.get_metrics()
    if not metrics:
        return {
            "message": "Model metrics not available. Run 'python -m app.ml.train' first.",
            "available": False,
        }
    return {**metrics, "available": True}
