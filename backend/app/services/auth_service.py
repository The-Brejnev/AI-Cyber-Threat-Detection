import secrets
import string
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.otp import OtpCode
from app.security.password import hash_otp, verify_otp


OTP_EXPIRY_MINUTES = 3000
OTP_MAX_ATTEMPTS = 5
OTP_RESEND_COOLDOWN_SECONDS = 60


def generate_otp() -> str:
    """Generate a cryptographically secure 6-digit OTP."""
    return "".join(
        secrets.choice(string.digits)
        for _ in range(6)
    )


def create_otp(db: Session, email: str, purpose: str):
    """
    Create a new OTP.

    The plaintext OTP is returned only so the email service
    can send it. Only the hash is stored in the database.
    """

    # Normalize email
    email = email.strip().lower()

    otp_plain = generate_otp()
    hashed = hash_otp(otp_plain)

    expires_at = datetime.utcnow() + timedelta(
        minutes=OTP_EXPIRY_MINUTES
    )

    otp_record = OtpCode(
        email=email,
        hashed_otp=hashed,
        purpose=purpose,
        is_used=False,
        attempts=0,
        expires_at=expires_at,
    )

    db.add(otp_record)
    db.commit()
    db.refresh(otp_record)

    return otp_plain, otp_record


def verify_otp_code(
    db: Session,
    email: str,
    otp_plain: str,
    purpose: str,
):
    """
    Verify OTP.

    IMPORTANT:
    A valid OTP is consumed here exactly once.
    """

    email = email.strip().lower()
    otp_plain = str(otp_plain).strip()

    otp_record = (
        db.query(OtpCode)
        .filter(
            OtpCode.email == email,
            OtpCode.purpose == purpose,
            OtpCode.is_used == False,
        )
        .order_by(OtpCode.created_at.desc())
        .first()
    )

    if not otp_record:
        return False, "OTP not found or already used."

    # Expiration check
    if datetime.utcnow() > otp_record.expires_at:
        return False, "OTP expired. Please request a new OTP."

    # Attempt limit
    if otp_record.attempts >= OTP_MAX_ATTEMPTS:
        return False, "Too many incorrect attempts. Please request a new OTP."

    # Verify OTP
    if not verify_otp(otp_plain, otp_record.hashed_otp):
        otp_record.attempts += 1
        db.commit()

        remaining = OTP_MAX_ATTEMPTS - otp_record.attempts

        if remaining <= 0:
            return False, "Too many incorrect attempts. Please request a new OTP."

        return False, f"Invalid OTP. {remaining} attempts remaining."

    # Correct OTP
    
    db.commit()

    return True, "Success."


def check_resend_cooldown(
    db: Session,
    email: str,
    purpose: str,
) -> bool:

    email = email.strip().lower()

    last_otp = (
        db.query(OtpCode)
        .filter(
            OtpCode.email == email,
            OtpCode.purpose == purpose,
        )
        .order_by(OtpCode.created_at.desc())
        .first()
    )

    if not last_otp:
        return True

    elapsed = datetime.utcnow() - last_otp.created_at

    return elapsed >= timedelta(
        seconds=OTP_RESEND_COOLDOWN_SECONDS
    )