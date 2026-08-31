"""
Password & OTP Hashing and Verification Module using bcrypt directly.
"""
import bcrypt

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def hash_otp(otp: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(otp.encode('utf-8'), salt).decode('utf-8')

def verify_otp(plain_otp: str, hashed_otp: str) -> bool:
    try:
        return bcrypt.checkpw(plain_otp.encode('utf-8'), hashed_otp.encode('utf-8'))
    except Exception:
        return False
