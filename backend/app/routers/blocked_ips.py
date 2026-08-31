"""
Blocked IPs router — IP blocklist management with Sub-Admin read-only protection.
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.dependencies import get_current_user, require_write_access
from app.models.user import User
from app.models.audit_log import BlockedIp, AuditLog

router = APIRouter(prefix="/blocked-ips", tags=["blocked_ips"])


@router.get("")
def get_blocked_ips(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List blocked IPs. Admins & Sub-Admins see all blocks; users see their own.
    """
    effective_limit = limit or page_size
    effective_offset = offset if offset is not None else (page - 1) * effective_limit

    query = db.query(BlockedIp)

    if current_user.role not in ("admin", "sub_admin"):
        query = query.filter(BlockedIp.user_id == current_user.id)

    if is_active is not None:
        query = query.filter(BlockedIp.is_active == is_active)
    if search:
        s = f"%{search}%"
        query = query.filter(
            (BlockedIp.ip_address.ilike(s)) | (BlockedIp.reason.ilike(s))
        )

    total = query.count()
    items = query.order_by(desc(BlockedIp.blocked_at)).offset(effective_offset).limit(effective_limit).all()

    return {
        "items": [
            {
                "id": str(b.id),
                "ip_address": b.ip_address,
                "reason": b.reason,
                "threat_type": b.threat_type,
                "is_active": b.is_active,
                "blocked_at": b.blocked_at.isoformat() + "Z" if b.blocked_at else None,
                "unblocked_at": b.unblocked_at.isoformat() + "Z" if b.unblocked_at else None,
                "blocked_by": b.blocked_by,
            }
            for b in items
        ],
        "total": total,
        "page": (effective_offset // effective_limit) + 1,
        "page_size": effective_limit,
        "pages": max(1, (total + effective_limit - 1) // effective_limit),
    }


@router.post("")
def block_ip(
    payload: dict,
    current_user: User = Depends(require_write_access),
    db: Session = Depends(get_db)
):
    """Block an IP address — Restricted for Sub-Admin."""
    ip = payload.get("ip_address", "").strip()
    reason = payload.get("reason", "").strip()
    threat_type = payload.get("threat_type")

    if not ip or not reason:
        raise HTTPException(status_code=400, detail="ip_address and reason are required.")

    existing = (
        db.query(BlockedIp)
        .filter(
            BlockedIp.user_id == current_user.id,
            BlockedIp.ip_address == ip,
            BlockedIp.is_active == True,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail=f"IP {ip} is already blocked.")

    new_block = BlockedIp(
        user_id=current_user.id,
        ip_address=ip,
        reason=reason,
        threat_type=threat_type,
        blocked_at=datetime.utcnow(),
        is_active=True,
        blocked_by=f"Operator ({current_user.role})",
    )
    db.add(new_block)

    db.add(AuditLog(
        user_id=current_user.id,
        action="block_ip",
        resource_type="blocked_ip",
        resource_id=ip,
        ip_address=ip,
        status="success",
        details={"reason": reason, "threat_type": threat_type},
    ))
    db.commit()
    return {"message": f"IP {ip} has been blocked.", "id": str(new_block.id)}


@router.delete("/{block_id}")
def unblock_ip(
    block_id: str,
    current_user: User = Depends(require_write_access),
    db: Session = Depends(get_db)
):
    """Unblock an IP — Restricted for Sub-Admin."""
    from uuid import UUID
    try:
        bid = UUID(block_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid block ID.")

    block = db.query(BlockedIp).filter(BlockedIp.id == bid).first()
    if not block:
        raise HTTPException(status_code=404, detail="Block record not found.")

    if current_user.role != "admin" and block.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    block.is_active = False
    block.unblocked_at = datetime.utcnow()

    db.add(AuditLog(
        user_id=current_user.id,
        action="unblock_ip",
        resource_type="blocked_ip",
        resource_id=block.ip_address,
        ip_address=block.ip_address,
        status="success",
        details={"unblocked_by": current_user.email},
    ))
    db.commit()
    return {"message": f"IP {block.ip_address} has been unblocked."}


@router.get("/check/{ip}")
def check_ip_blocked(
    ip: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if an IP is currently blocked."""
    block = (
        db.query(BlockedIp)
        .filter(
            BlockedIp.ip_address == ip,
            BlockedIp.is_active == True,
        )
        .first()
    )
    return {
        "ip": ip,
        "is_blocked": block is not None,
        "block_info": {
            "reason": block.reason if block else None,
            "blocked_at": block.blocked_at.isoformat() + "Z" if block and block.blocked_at else None,
            "blocked_by": block.blocked_by if block else None
        } if block else None
    }
