"""
Dashboard stats router — Multi-tenant system-wide visibility for Admin & Sub-Admin.
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from fastapi import APIRouter, Depends

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.threat import Threat
from app.models.device import Device
from app.models.audit_log import BlockedIp
from app.ml.model import get_predictor

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Return dashboard statistics.
    Admin & Sub-Admin view network-wide metrics across all users.
    Standard users view metrics for their own assets.
    """
    uid = current_user.id
    is_admin_scope = current_user.role in ("admin", "sub_admin")
    
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)

    # ── Queries with scope ──────────────────────────────────────────────────
    t_query = db.query(Threat)
    d_query = db.query(Device)
    b_query = db.query(BlockedIp)

    if not is_admin_scope:
        t_query = t_query.filter(Threat.user_id == uid)
        d_query = d_query.filter(Device.user_id == uid)
        b_query = b_query.filter(BlockedIp.user_id == uid)

    total_threats = t_query.count()
    critical_threats = t_query.filter(Threat.severity == "CRITICAL").count()
    active_devices = d_query.filter(Device.status == "active").count()
    blocked_ips_count = b_query.filter(BlockedIp.is_active == True).count()
    threats_today = t_query.filter(Threat.created_at >= today_start).count()
    threats_this_week = t_query.filter(Threat.created_at >= week_ago).count()

    # ── Recent threats (last 10) ──────────────────────────────────────────────
    recent_threats = (
        t_query
        .order_by(desc(Threat.created_at))
        .limit(10)
        .all()
    )
    recent_list = [
        {
            "id": str(t.id),
            "threat_type": t.threat_type,
            "severity": t.severity,
            "risk_score": round(t.risk_score, 1),
            "source_ip": t.source_ip,
            "destination_ip": t.destination_ip,
            "protocol": t.protocol,
            "status": t.status,
            "created_at": t.created_at.isoformat() + "Z",
        }
        for t in recent_threats
    ]

    # ── Threat distribution by type (last 7 days) ─────────────────────────────
    dist_q = db.query(Threat.threat_type, func.count(Threat.id).label("count")).filter(
        Threat.created_at >= week_ago, Threat.threat_type != "NORMAL"
    )
    if not is_admin_scope:
        dist_q = dist_q.filter(Threat.user_id == uid)
    type_rows = dist_q.group_by(Threat.threat_type).all()
    threat_distribution = {row.threat_type: row.count for row in type_rows}

    # ── Severity distribution (last 7 days) ───────────────────────────────────
    sev_q = db.query(Threat.severity, func.count(Threat.id).label("count")).filter(
        Threat.created_at >= week_ago
    )
    if not is_admin_scope:
        sev_q = sev_q.filter(Threat.user_id == uid)
    severity_rows = sev_q.group_by(Threat.severity).all()
    severity_distribution = {row.severity: row.count for row in severity_rows}

    # ── Top attacking IPs ────────────────────────────────────────────────────
    top_ip_q = db.query(Threat.source_ip, func.count(Threat.id).label("count"), Threat.severity).filter(
        Threat.threat_type != "NORMAL"
    )
    if not is_admin_scope:
        top_ip_q = top_ip_q.filter(Threat.user_id == uid)
    ip_rows = top_ip_q.group_by(Threat.source_ip, Threat.severity).order_by(desc("count")).limit(5).all()
    top_attacking_ips = [
        {"ip": row.source_ip, "count": row.count, "severity": row.severity}
        for row in ip_rows
    ]

    # ── ML metrics ────────────────────────────────────────────────────────────
    metrics = get_predictor().get_metrics()
    detection_accuracy = metrics.get("accuracy", 0.994)

    return {
        "total_threats": total_threats,
        "critical_threats": critical_threats,
        "active_devices": active_devices,
        "blocked_ips": blocked_ips_count,
        "threats_today": threats_today,
        "threats_this_week": threats_this_week,
        "detection_accuracy": detection_accuracy,
        "recent_threats": recent_list,
        "threat_distribution": threat_distribution,
        "severity_distribution": severity_distribution,
        "top_attacking_ips": top_attacking_ips,
        "is_admin_view": is_admin_scope
    }
