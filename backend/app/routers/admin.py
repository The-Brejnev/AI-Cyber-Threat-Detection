"""
Admin Router — User Management, Role Promotion (Sub-Admin / Admin), and Authorized Security Directives.
"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from pydantic import BaseModel

from app.database import get_db
from app.dependencies import get_current_user, require_admin, require_admin_or_subadmin
from app.models.user import User, UserProfile, UserSettings
from app.models.threat import Threat
from app.models.device import Device
from app.models.notification import Notification
from app.models.audit_log import AuditLog
from app.routers.websocket import manager
from app.services.email_service import send_admin_advisory_email

router = APIRouter(prefix="/admin", tags=["admin"])


class AdminNoticeRequest(BaseModel):
    target_user_id: Optional[str] = None  # None or "all" for broadcast to all users
    title: str
    message: str
    severity: Optional[str] = "HIGH"  # CRITICAL, HIGH, MEDIUM, LOW
    proxy_ip: Optional[str] = "10.201.64.21"
    attacker_ip: Optional[str] = None
    send_email: Optional[bool] = True


@router.get("/users")
def get_all_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    current_user: User = Depends(require_admin_or_subadmin),
    db: Session = Depends(get_db)
):
    """
    Returns all registered users with their profiles, assigned roles,
    and associated telemetry counts. Accessible to Admin and Sub-Admin.
    """
    query = db.query(User).order_by(desc(User.created_at))

    if role:
        query = query.filter(User.role == role.lower())
    if search:
        s = f"%{search}%"
        query = query.filter(User.email.ilike(s))

    users = query.all()
    results = []

    for u in users:
        prof = db.query(UserProfile).filter(UserProfile.user_id == u.id).first()
        threat_count = db.query(func.count(Threat.id)).filter(Threat.user_id == u.id).scalar() or 0
        device_count = db.query(func.count(Device.id)).filter(Device.user_id == u.id).scalar() or 0

        results.append({
            "id": str(u.id),
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "is_verified": u.is_verified,
            "full_name": prof.full_name if prof else "N/A",
            "phone": prof.phone if prof else "N/A",
            "timezone": prof.timezone if prof else "UTC",
            "threat_count": threat_count,
            "device_count": device_count,
            "created_at": u.created_at.isoformat() + "Z" if u.created_at else None,
            "last_login": u.last_login.isoformat() + "Z" if u.last_login else None,
        })

    return {
        "users": results,
        "total": len(results),
        "admin_count": sum(1 for x in results if x["role"] == "admin"),
        "sub_admin_count": sum(1 for x in results if x["role"] == "sub_admin"),
        "standard_user_count": sum(1 for x in results if x["role"] == "user")
    }


@router.post("/notify-user")
async def send_authorized_notice(
    req: AdminNoticeRequest,
    current_user: User = Depends(require_admin_or_subadmin),
    db: Session = Depends(get_db)
):
    """
    Admin and Sub-Admin dispatch an official authorized security notice / directive
    to a user's dashboard, real-time WebSocket, and email address.
    """
    if not req.title.strip() or not req.message.strip():
        raise HTTPException(status_code=400, detail="Title and message are required.")

    target_users = []
    if req.target_user_id and req.target_user_id != "all":
        try:
            uid = UUID(req.target_user_id)
            target = db.query(User).filter(User.id == uid).first()
            if not target:
                raise HTTPException(status_code=404, detail="Target user not found.")
            target_users.append(target)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid target user ID.")
    else:
        # Broadcast to all active users
        target_users = db.query(User).filter(User.is_active == True).all()

    sender_prof = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    sender_name = sender_prof.full_name if sender_prof else current_user.email
    sender_role = "Primary Administrator" if current_user.role == "admin" else "Sub-Administrator (SOC)"

    notice_payload = {
        "title": f"🛡️ [OFFICIAL DIRECTIVE] {req.title}",
        "message": req.message,
        "severity": req.severity or "HIGH",
        "sender_name": sender_name,
        "sender_email": current_user.email,
        "sender_role": sender_role,
        "proxy_ip": req.proxy_ip or "10.201.64.21",
        "attacker_ip": req.attacker_ip,
        "created_at": None
    }

    sent_emails = 0

    for u in target_users:
        # 1. Create in-app Notification record
        notif = Notification(
            user_id=u.id,
            title=f"🛡️ {req.title}",
            message=req.message,
            notification_type="admin_directive",
            severity=req.severity or "HIGH"
        )
        db.add(notif)
        db.flush()

        # 2. Dispatch real-time WebSocket alert
        notice_payload["id"] = str(notif.id)
        notice_payload["created_at"] = notif.created_at.isoformat() + "Z"
        await manager.send_to_user(str(u.id), {
            "type": "admin_notice",
            "data": notice_payload
        })

        # 3. Dispatch official email
        if req.send_email:
            try:
                await send_admin_advisory_email(u.email, notice_payload)
                sent_emails += 1
            except Exception:
                pass

    # Audit Trail
    db.add(AuditLog(
        user_id=current_user.id,
        action="admin_security_notice",
        resource_type="notification",
        status="success",
        details={
            "title": req.title,
            "target_count": len(target_users),
            "severity": req.severity,
            "sender": current_user.email
        }
    ))
    db.commit()

    return {
        "message": f"Official authorized directive sent to {len(target_users)} user(s) (Emails delivered: {sent_emails}).",
        "recipient_count": len(target_users),
        "sent_emails": sent_emails
    }


@router.get("/notification-history")
def get_notification_history(
    search: Optional[str] = None,
    severity: Optional[str] = None,
    notification_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    current_user: User = Depends(require_admin_or_subadmin),
    db: Session = Depends(get_db)
):
    """
    Returns complete system-wide notification & directive history
    for all users. Accessible by Primary Admin and Sub-Admin.
    """
    query = db.query(Notification).join(User, Notification.user_id == User.id)

    if severity:
        query = query.filter(Notification.severity == severity.upper())
    if notification_type:
        query = query.filter(Notification.notification_type == notification_type)
    if search:
        s = f"%{search}%"
        query = query.filter(
            (Notification.title.ilike(s)) |
            (Notification.message.ilike(s)) |
            (User.email.ilike(s))
        )

    total = query.count()
    items = query.order_by(desc(Notification.created_at)).offset((page - 1) * page_size).limit(page_size).all()

    results = []
    for n in items:
        target_user = db.query(User).filter(User.id == n.user_id).first()
        prof = db.query(UserProfile).filter(UserProfile.user_id == n.user_id).first() if target_user else None
        
        results.append({
            "id": str(n.id),
            "title": n.title,
            "message": n.message,
            "notification_type": n.notification_type,
            "severity": n.severity or "INFO",
            "is_read": n.is_read,
            "email_sent": n.email_sent,
            "created_at": n.created_at.isoformat() + "Z" if n.created_at else None,
            "target_user_id": str(n.user_id),
            "target_email": target_user.email if target_user else "Unknown",
            "target_name": prof.full_name if prof and prof.full_name else (target_user.email.split('@')[0] if target_user else "User"),
            "target_role": target_user.role if target_user else "user"
        })

    return {
        "items": results,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: str,
    payload: dict,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Promote or change user role ('admin', 'sub_admin', 'user').
    Only Primary Administrators have authority to change roles.
    """
    try:
        uid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format.")

    new_role = payload.get("role", "").lower()
    if new_role not in ("admin", "sub_admin", "user"):
        raise HTTPException(
            status_code=400,
            detail="Invalid role. Must be 'admin', 'sub_admin' (Read-Only), or 'user'."
        )

    target_user = db.query(User).filter(User.id == uid).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found.")

    if target_user.id == current_user.id and new_role != "admin":
        raise HTTPException(status_code=400, detail="You cannot demote your own administrator account.")

    old_role = target_user.role
    target_user.role = new_role

    # Audit trail
    db.add(AuditLog(
        user_id=current_user.id,
        action="user_role_change",
        resource_type="user",
        resource_id=str(target_user.id),
        status="success",
        details={
            "target_email": target_user.email,
            "old_role": old_role,
            "new_role": new_role,
            "note": "Promoted to Sub-Admin (Read-Only)" if new_role == "sub_admin" else f"Changed to {new_role}"
        }
    ))
    db.commit()

    return {
        "message": f"Successfully updated {target_user.email} role from '{old_role}' to '{new_role}'.",
        "user_id": str(target_user.id),
        "new_role": new_role
    }


@router.patch("/users/{user_id}/status")
def toggle_user_status(
    user_id: str,
    payload: dict,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Activate or Deactivate user account."""
    try:
        uid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format.")

    is_active = payload.get("is_active")
    if is_active is None or not isinstance(is_active, bool):
        raise HTTPException(status_code=400, detail="is_active must be a boolean.")

    target_user = db.query(User).filter(User.id == uid).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found.")

    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account.")

    target_user.is_active = is_active
    db.commit()

    return {
        "message": f"User {target_user.email} is now {'Active' if is_active else 'Deactivated'}.",
        "user_id": str(target_user.id),
        "is_active": is_active
    }


@router.delete("/users/{user_id}")
def admin_delete_user(
    user_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Permanently delete a user or sub-admin account. Accessible by Primary Admin.
    """
    try:
        uid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format.")

    if uid == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account from here. Use Profile settings.")

    target_user = db.query(User).filter(User.id == uid).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    target_email = target_user.email
    target_role = target_user.role

    try:
        from app.models.threat import Threat, NetworkEvent, ThreatPrediction
        from app.models.device import Device
        from app.models.notification import Notification
        from app.models.scan import Scan
        from app.models.audit_log import BlockedIp, AuditLog
        from app.models.otp import OtpCode

        db.query(ThreatPrediction).filter(ThreatPrediction.user_id == target_user.id).delete(synchronize_session=False)
        db.query(Threat).filter(Threat.user_id == target_user.id).delete(synchronize_session=False)
        db.query(NetworkEvent).filter(NetworkEvent.user_id == target_user.id).delete(synchronize_session=False)
        db.query(Device).filter(Device.user_id == target_user.id).delete(synchronize_session=False)
        db.query(Notification).filter(Notification.user_id == target_user.id).delete(synchronize_session=False)
        db.query(Scan).filter(Scan.user_id == target_user.id).delete(synchronize_session=False)
        db.query(BlockedIp).filter(BlockedIp.user_id == target_user.id).delete(synchronize_session=False)
        db.query(AuditLog).filter(AuditLog.user_id == target_user.id).delete(synchronize_session=False)
        db.query(OtpCode).filter(OtpCode.email == target_email).delete(synchronize_session=False)
        db.query(UserProfile).filter(UserProfile.user_id == target_user.id).delete(synchronize_session=False)
        db.query(UserSettings).filter(UserSettings.user_id == target_user.id).delete(synchronize_session=False)
        db.query(User).filter(User.id == target_user.id).delete(synchronize_session=False)

        db.add(AuditLog(
            user_id=current_user.id,
            action="admin_delete_user",
            resource_type="user",
            resource_id=user_id,
            status="success",
            details={"deleted_email": target_email, "role": target_role, "deleted_by": current_user.email}
        ))
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")

    return {"message": f"User {target_email} ({target_role}) has been permanently deleted."}

