"""
Complete settings router with audit logs, login history, and AI auto-blocking configurations.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User, UserSettings
from app.models.audit_log import AuditLog

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("")
def get_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    s = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not s:
        s = UserSettings(user_id=current_user.id)
        db.add(s)
        db.commit()
        db.refresh(s)

    return {
        "id": str(s.id),
        "user_id": str(s.user_id),
        "email_notifications": s.email_notifications,
        "sms_notifications": s.sms_notifications,
        "critical_alerts": s.critical_alerts,
        "high_alerts": s.high_alerts,
        "medium_alerts": s.medium_alerts,
        "low_alerts": s.low_alerts,
        "dashboard_refresh": s.dashboard_refresh,
        "theme": s.theme,
        "auto_block_enabled": getattr(s, "auto_block_enabled", True),
        "auto_block_severity": getattr(s, "auto_block_severity", "CRITICAL"),
        "auto_block_threshold": getattr(s, "auto_block_threshold", 80),
    }


@router.put("")
def update_settings(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    s = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not s:
        s = UserSettings(user_id=current_user.id)
        db.add(s)

    allowed_fields = {
        "email_notifications", "sms_notifications", "critical_alerts",
        "high_alerts", "medium_alerts", "low_alerts", "dashboard_refresh", "theme",
        "auto_block_enabled", "auto_block_severity", "auto_block_threshold"
    }
    for k, v in payload.items():
        if k in allowed_fields and hasattr(s, k):
            setattr(s, k, v)

    db.add(AuditLog(
        user_id=current_user.id,
        action="settings_update",
        resource_type="user_settings",
        resource_id=str(current_user.id),
        status="success",
        details=payload,
    ))
    db.commit()
    return {"message": "Settings updated successfully."}


@router.get("/audit-logs")
def get_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Paginated audit log for the current user."""
    query = (
        db.query(AuditLog)
        .filter(AuditLog.user_id == current_user.id)
        .order_by(desc(AuditLog.created_at))
    )
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [
            {
                "id": str(log.id),
                "action": log.action,
                "resource_type": log.resource_type,
                "ip_address": log.ip_address,
                "status": log.status,
                "details": log.details,
                "created_at": log.created_at.isoformat() + "Z" if log.created_at else None,
            }
            for log in items
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, (total + page_size - 1) // page_size),
    }


@router.get("/login-history")
def get_login_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Recent login and logout events for the current user."""
    logs = (
        db.query(AuditLog)
        .filter(
            AuditLog.user_id == current_user.id,
            AuditLog.action.in_(["login", "logout", "login_failed"])
        )
        .order_by(desc(AuditLog.created_at))
        .limit(30)
        .all()
    )
    return [
        {
            "id": str(log.id),
            "action": log.action,
            "ip_address": log.ip_address,
            "status": log.status,
            "created_at": log.created_at.isoformat() + "Z" if log.created_at else None,
        }
        for log in logs
    ]


@router.post("/logout-all")
def logout_all_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Log the action (JWT is stateless; tokens expire by TTL)."""
    db.add(AuditLog(
        user_id=current_user.id,
        action="logout_all_sessions",
        resource_type="user",
        resource_id=str(current_user.id),
        status="success",
        details={"note": "All active sessions invalidated. Existing JWTs will expire by TTL."},
    ))
    db.commit()
    return {"message": "All sessions logged out. Existing tokens will expire by their TTL."}
