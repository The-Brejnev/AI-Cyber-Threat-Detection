"""
Complete auth router with all required endpoints.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import (
    RegisterRequest, LoginRequest, OTPRequest,
    ResetPasswordRequest, TokenResponse, UserResponse
)
from app.models.user import User, UserProfile, UserSettings
from app.models.audit_log import AuditLog
from app.security.password import hash_password, verify_password
from app.security.jwt import create_access_token, create_refresh_token
from app.services.auth_service import create_otp, verify_otp_code, check_resend_cooldown
from app.services.email_service import send_otp_email
from app.dependencies import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _normalize_purpose(purpose: str) -> str:
    p = (purpose or "").lower().strip()
    if p in ("registration", "register", "signup"):
        return "registration"
    if p in ("password_reset", "reset_password", "reset", "forgot_password"):
        return "password_reset"
    return p


@router.post("/send-otp")
async def send_otp(req: OTPRequest, request: Request, db: Session = Depends(get_db)):
    """Send OTP to email. Respects 60-second resend cooldown."""
    purpose = _normalize_purpose(req.purpose)
    if purpose not in ("registration", "password_reset"):
        raise HTTPException(status_code=400, detail="Invalid OTP purpose.")

    if not check_resend_cooldown(db, req.email, purpose):
        raise HTTPException(
            status_code=429,
            detail="Please wait 60 seconds before requesting another OTP."
        )

    otp_plain, _ = create_otp(db, req.email, purpose)
    sent = await send_otp_email(req.email, otp_plain, purpose)

    # Audit log
    db.add(AuditLog(
        action="send_otp",
        resource_type="otp",
        ip_address=_client_ip(request),
        status="success",
        details={"email": req.email, "purpose": purpose, "email_sent": sent}
    ))
    db.commit()

    if sent:
        msg = "OTP sent to your email address."
    else:
        msg = f"OTP Code: {otp_plain} (Add Gmail App Password in backend/.env for real SMTP delivery)"

    return {
        "message": msg,
        "email_sent": sent,
        "dev_otp": otp_plain if not sent else None
    }


@router.post("/verify-otp")
def verify_otp_endpoint(payload: dict, db: Session = Depends(get_db)):
    """Verify OTP without completing registration (for frontend step-by-step flow)."""
    email = payload.get("email", "")
    otp = payload.get("otp", "")
    purpose = _normalize_purpose(payload.get("purpose", "registration"))
    if not email or not otp:
        raise HTTPException(status_code=400, detail="Email and OTP are required.")
    is_valid, msg = verify_otp_code(db, email, otp, purpose)
    if not is_valid:
        raise HTTPException(status_code=400, detail=msg)
    return {"message": "OTP verified successfully.", "verified": True}


@router.post("/register", status_code=201)
async def register(
    req: RegisterRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    email = req.email.strip().lower()

    if req.password != req.confirm_password:
        raise HTTPException(
            status_code=400,
            detail="Passwords do not match."
        )

    if len(req.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters."
        )

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=409,
            detail="Email already registered."
        )

    is_valid, msg = verify_otp_code(
        db,
        email,
        req.otp,
        "registration"
    )

    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail=msg
        )

    assigned_role = (req.role or "user").strip().lower()
    if assigned_role not in ("admin", "sub_admin", "user"):
        assigned_role = "user"

    user = User(
        email=email,
        hashed_password=hash_password(req.password),
        role=assigned_role,
        is_verified=True,
        is_active=True,
    )

    db.add(user)
    db.flush()

    profile = UserProfile(
        user_id=user.id,
        full_name=req.full_name,
        phone=req.phone
    )

    user_settings = UserSettings(
        user_id=user.id
    )

    db.add_all([
        profile,
        user_settings
    ])

    db.add(AuditLog(
        user_id=user.id,
        action="register",
        resource_type="user",
        resource_id=str(user.id),
        ip_address=_client_ip(request),
        status="success",
    ))

    db.commit()

    return {
        "message": "Registration successful. You can now log in."
    }


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Authenticate user and return JWT tokens."""
    email = req.email.strip().lower() if req.email else ""
    user = db.query(User).filter(User.email.ilike(email)).first()

    if not user or not verify_password(req.password, user.hashed_password):
        db.add(AuditLog(
            action="login_failed",
            ip_address=_client_ip(request),
            status="failure",
            details={"email": req.email}
        ))
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled. Contact support.")

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Please verify your email before logging in.")

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    # Update last_login
    user.last_login = datetime.utcnow()
    db.add(AuditLog(
        user_id=user.id,
        action="login",
        resource_type="user",
        resource_id=str(user.id),
        ip_address=_client_ip(request),
        status="success",
    ))
    db.commit()

    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    full_name = profile.full_name if profile else ""

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": full_name,
            "role": user.role,
        }
    }


@router.post("/forgot-password")
async def forgot_password(req: OTPRequest, request: Request, db: Session = Depends(get_db)):
    """
    Send password-reset OTP.
    Always returns 200 regardless of whether email exists (prevents enumeration).
    """
    user = db.query(User).filter(User.email == req.email).first()
    if user:
        if not check_resend_cooldown(db, req.email, "password_reset"):
            # Still return generic response to prevent timing attacks
            return {"message": "If this email is registered, a reset code has been sent."}

        otp_plain, _ = create_otp(db, req.email, "password_reset")
        await send_otp_email(req.email, otp_plain, "password_reset")

        db.add(AuditLog(
            user_id=user.id,
            action="forgot_password_otp",
            ip_address=_client_ip(request),
            status="success",
        ))
        db.commit()

    return {"message": "If this email is registered, a reset code has been sent."}


@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """Reset password using OTP."""
    if req.new_password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    is_valid, msg = verify_otp_code(db, req.email, req.otp, "password_reset")
    if not is_valid:
        raise HTTPException(status_code=400, detail=msg)

    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        # Generic response
        raise HTTPException(status_code=400, detail="Password reset failed. Please try again.")

    user.hashed_password = hash_password(req.new_password)
    db.add(AuditLog(
        user_id=user.id,
        action="password_reset",
        ip_address=_client_ip(request),
        status="success",
    ))
    db.commit()

    return {"message": "Password reset successfully. You can now log in."}


@router.post("/logout")
async def logout(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Logout user (audit log entry; JWT is stateless)."""
    db.add(AuditLog(
        user_id=current_user.id,
        action="logout",
        resource_type="user",
        resource_id=str(current_user.id),
        ip_address=_client_ip(request),
        status="success",
    ))
    db.commit()
    return {"message": "Logged out successfully."}


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current authenticated user info."""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": profile.full_name if profile else "",
        "phone": profile.phone if profile else "",
        "role": current_user.role,
        "is_active": current_user.is_active,
        "is_verified": current_user.is_verified,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        "last_login": current_user.last_login.isoformat() if current_user.last_login else None,
    }
