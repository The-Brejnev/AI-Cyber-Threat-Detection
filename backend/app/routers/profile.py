"""
Complete profile router — view and edit profile, change password, change email.
"""
from datetime import datetime
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User, UserProfile, UserSettings
from app.models.audit_log import AuditLog
from app.security.password import hash_password, verify_password

router = APIRouter(prefix="/profile", tags=["profile"])

EMAIL_REGEX = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"


@router.get("")
def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's profile information."""
    prof = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    sett = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()

    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "is_verified": current_user.is_verified,
        "created_at": current_user.created_at.isoformat() + "Z" if current_user.created_at else None,
        "last_login": current_user.last_login.isoformat() + "Z" if current_user.last_login else None,
        "full_name": prof.full_name if prof else "",
        "phone": prof.phone if prof else "",
        "avatar_url": prof.avatar_url if prof else None,
        "timezone": prof.timezone if prof else "UTC",
        "settings": {
            "email_notifications": sett.email_notifications if sett else True,
            "sms_notifications": sett.sms_notifications if sett else False,
            "critical_alerts": sett.critical_alerts if sett else True,
            "high_alerts": sett.high_alerts if sett else True,
            "medium_alerts": sett.medium_alerts if sett else False,
            "low_alerts": sett.low_alerts if sett else False,
            "dashboard_refresh": sett.dashboard_refresh if sett else 30,
            "theme": sett.theme if sett else "dark",
        } if sett else {},
    }


@router.put("")
def update_profile(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update profile fields: full_name, phone, timezone."""
    prof = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not prof:
        prof = UserProfile(user_id=current_user.id)
        db.add(prof)

    if "full_name" in payload:
        prof.full_name = payload["full_name"]
    if "phone" in payload:
        prof.phone = payload["phone"]
    if "timezone" in payload:
        prof.timezone = payload["timezone"]

    db.add(AuditLog(
        user_id=current_user.id,
        action="profile_update",
        resource_type="user_profile",
        resource_id=str(current_user.id),
        status="success",
    ))
    db.commit()
    return {"message": "Profile updated successfully."}


@router.put("/change-email")
def change_email(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update account email address with password security verification."""
    new_email = payload.get("new_email", "").strip().lower()
    password = payload.get("password", "").strip()

    if not new_email or not password:
        raise HTTPException(status_code=400, detail="New email address and current password are required.")

    if not re.match(EMAIL_REGEX, new_email):
        raise HTTPException(status_code=400, detail="Invalid email format.")

    if new_email == current_user.email.lower():
        raise HTTPException(status_code=400, detail="New email address is the same as your current email.")

    # Verify password
    if not verify_password(password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password entered is incorrect.")

    # Check for existing email in database
    existing = db.query(User).filter(User.email.ilike(new_email)).first()
    if existing and existing.id != current_user.id:
        raise HTTPException(status_code=409, detail=f"Email '{new_email}' is already in use by another account.")

    old_email = current_user.email
    current_user.email = new_email
    current_user.updated_at = datetime.utcnow()

    db.add(AuditLog(
        user_id=current_user.id,
        action="email_change",
        resource_type="user",
        resource_id=str(current_user.id),
        status="success",
        details={"old_email": old_email, "new_email": new_email}
    ))
    db.commit()

    return {
        "message": f"Email updated successfully to {new_email}.",
        "email": new_email
    }


@router.put("/change-password")
def change_password(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change password with current password verification."""
    current_password = payload.get("current_password", "").strip()
    new_password = payload.get("new_password", "").strip()
    confirm_password = payload.get("confirm_password", "").strip()

    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="Current password and new password are required.")

    if confirm_password and new_password != confirm_password:
        raise HTTPException(status_code=400, detail="New passwords do not match.")

    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")

    if not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password entered is incorrect.")

    current_user.hashed_password = hash_password(new_password)
    current_user.updated_at = datetime.utcnow()

    db.add(AuditLog(
        user_id=current_user.id,
        action="password_change",
        resource_type="user",
        resource_id=str(current_user.id),
        status="success",
        details={"note": "User changed their password via Profile"}
    ))
    db.commit()
    return {"message": "Password changed successfully."}


@router.delete("/delete-account")
def delete_own_account(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Permanently delete own account.
    Requires password verification and confirmation string 'DELETE'.
    Applies to User, Sub-Admin, and Admin.
    """
    password = payload.get("password", "").strip()
    confirmation = payload.get("confirmation", "").strip().upper()

    if not password:
        raise HTTPException(status_code=400, detail="Current password is required to confirm account deletion.")

    if confirmation != "DELETE":
        raise HTTPException(status_code=400, detail="Please type 'DELETE' to confirm permanent account removal.")

    if not verify_password(password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Password entered is incorrect.")

    # If primary admin, prevent deletion if they are the sole admin
    if current_user.role == "admin":
        other_admins = db.query(User).filter(User.role == "admin", User.id != current_user.id).count()
        if other_admins == 0:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete the sole Primary Admin account. Please designate another Admin before deleting."
            )

    user_id = current_user.id
    email = current_user.email

    try:
        from app.models.threat import Threat, NetworkEvent, ThreatPrediction
        from app.models.device import Device
        from app.models.notification import Notification
        from app.models.scan import Scan
        from app.models.audit_log import BlockedIp, AuditLog
        from app.models.otp import OtpCode

        db.query(ThreatPrediction).filter(ThreatPrediction.user_id == user_id).delete(synchronize_session=False)
        db.query(Threat).filter(Threat.user_id == user_id).delete(synchronize_session=False)
        db.query(NetworkEvent).filter(NetworkEvent.user_id == user_id).delete(synchronize_session=False)
        db.query(Device).filter(Device.user_id == user_id).delete(synchronize_session=False)
        db.query(Notification).filter(Notification.user_id == user_id).delete(synchronize_session=False)
        db.query(Scan).filter(Scan.user_id == user_id).delete(synchronize_session=False)
        db.query(BlockedIp).filter(BlockedIp.user_id == user_id).delete(synchronize_session=False)
        db.query(AuditLog).filter(AuditLog.user_id == user_id).delete(synchronize_session=False)
        db.query(OtpCode).filter(OtpCode.email == email).delete(synchronize_session=False)
        db.query(UserProfile).filter(UserProfile.user_id == user_id).delete(synchronize_session=False)
        db.query(UserSettings).filter(UserSettings.user_id == user_id).delete(synchronize_session=False)
        db.query(User).filter(User.id == user_id).delete(synchronize_session=False)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete account: {str(e)}")

    return {"message": "Your account has been permanently deleted."}

