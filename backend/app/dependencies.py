from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.security.jwt import verify_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = verify_token(token)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("sub")
    if not user_id:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="User account is deactivated. Contact system administrator."
        )

    return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Ensures the caller has primary administrator privileges."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Access denied. Administrator privileges are required."
        )
    return current_user

def require_admin_or_subadmin(current_user: User = Depends(get_current_user)) -> User:
    """Allows admins and sub-admins."""
    if current_user.role not in ("admin", "sub_admin"):
        raise HTTPException(
            status_code=403,
            detail="Access denied. Elevated privileges required."
        )
    return current_user

def require_write_access(current_user: User = Depends(get_current_user)) -> User:
    """Restricts sub-admins from write/modify operations (read-only enforcement)."""
    if current_user.role == "sub_admin":
        raise HTTPException(
            status_code=403,
            detail="Permission Denied: Sub-Admin role has Read-Only access. Modifying configurations or rules is restricted."
        )
    return current_user

def get_optional_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    if not token:
        return None
    try:
        return get_current_user(token, db)
    except HTTPException:
        return None
