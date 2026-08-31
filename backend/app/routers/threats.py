"""
Complete threats router with full CRUD, filtering, pagination, and per-event ML analysis.
Integrated with AI Active Defense Auto-Blocking and Multi-Tenant / Admin visibility.
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from app.database import get_db
from app.dependencies import get_current_user, require_write_access
from app.models.user import User
from app.models.threat import Threat, NetworkEvent
from app.models.device import Device
from app.ml.model import get_predictor
from app.services.notification_service import send_threat_notification
from app.services.defense_service import evaluate_auto_block
from app.services.geo_service import get_ip_info

router = APIRouter(prefix="/threats", tags=["threats"])


def _threat_to_dict(t: Threat, device_name: Optional[str] = None) -> dict:
    return {
        "id": str(t.id),
        "threat_type": t.threat_type,
        "severity": t.severity,
        "risk_score": round(t.risk_score, 2),
        "confidence": round(t.confidence, 4),
        "source_ip": t.source_ip,
        "destination_ip": t.destination_ip,
        "source_port": t.source_port,
        "destination_port": t.destination_port,
        "protocol": t.protocol,
        "device_id": str(t.device_id) if t.device_id else None,
        "device_name": device_name,
        "ml_model": t.ml_model,
        "detection_reason": t.detection_reason,
        "recommended_action": t.recommended_action,
        "status": t.status,
        "created_at": t.created_at.isoformat() + "Z" if t.created_at else None,
        "updated_at": t.updated_at.isoformat() + "Z" if t.updated_at else None,
    }


@router.get("")
def get_threats(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    severity: Optional[str] = None,
    threat_type: Optional[str] = None,
    source_ip: Optional[str] = None,
    device_id: Optional[str] = None,
    target_user_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Paginated, filtered list of threats.
    Admins & Sub-Admins see ALL threats system-wide (or can filter by user).
    Standard users see only their own threats.
    """
    query = db.query(Threat)

    # Role-based visibility
    if current_user.role not in ("admin", "sub_admin"):
        query = query.filter(Threat.user_id == current_user.id)
    elif target_user_id:
        from uuid import UUID
        try:
            query = query.filter(Threat.user_id == UUID(target_user_id))
        except ValueError:
            pass

    if severity:
        query = query.filter(Threat.severity == severity.upper())
    if threat_type:
        query = query.filter(Threat.threat_type == threat_type.upper())
    if source_ip:
        query = query.filter(Threat.source_ip.ilike(f"%{source_ip}%"))
    if device_id:
        from uuid import UUID
        try:
            query = query.filter(Threat.device_id == UUID(device_id))
        except ValueError:
            pass
    if status:
        query = query.filter(Threat.status == status.lower())
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                Threat.source_ip.ilike(s),
                Threat.destination_ip.ilike(s),
                Threat.threat_type.ilike(s),
                Threat.detection_reason.ilike(s),
            )
        )
    if date_from:
        try:
            query = query.filter(Threat.created_at >= datetime.fromisoformat(date_from.replace("Z", "")))
        except ValueError:
            pass
    if date_to:
        try:
            query = query.filter(Threat.created_at <= datetime.fromisoformat(date_to.replace("Z", "")))
        except ValueError:
            pass

    # Sorting
    sort_col = getattr(Threat, sort_by, Threat.created_at)
    if sort_order.lower() == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    devices = {str(d.id): d.name for d in db.query(Device).all()}
    items_dicts = [_threat_to_dict(t, devices.get(str(t.device_id))) for t in items]

    return {
        "items": items_dicts,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, (total + page_size - 1) // page_size),
    }


@router.get("/{threat_id}")
def get_threat(
    threat_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get single threat by ID."""
    from uuid import UUID
    try:
        tid = UUID(threat_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid threat ID.")

    threat = db.query(Threat).filter(Threat.id == tid).first()
    if not threat:
        raise HTTPException(status_code=404, detail="Threat not found.")
    if current_user.role not in ("admin", "sub_admin") and threat.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    devices = {str(d.id): d.name for d in db.query(Device).all()}
    return _threat_to_dict(threat, devices.get(str(threat.device_id)))


@router.patch("/{threat_id}/status")
def update_threat_status(
    threat_id: str,
    payload: dict,
    current_user: User = Depends(require_write_access),
    db: Session = Depends(get_db)
):
    """Update threat status — Restricted for Sub-Admin (Read-Only)."""
    from uuid import UUID
    try:
        tid = UUID(threat_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid threat ID.")

    new_status = payload.get("status")
    valid_statuses = ["active", "investigating", "resolved", "false_positive"]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {valid_statuses}"
        )

    threat = db.query(Threat).filter(Threat.id == tid).first()
    if not threat:
        raise HTTPException(status_code=404, detail="Threat not found.")
    if current_user.role != "admin" and threat.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    threat.status = new_status
    threat.updated_at = datetime.utcnow()
    db.commit()
    return {"message": f"Threat status updated to '{new_status}'.", "id": threat_id}


@router.post("/analyze")
async def analyze_event(
    event: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually submit a network event for ML analysis and automated mitigation."""
    required = ["source_ip", "destination_ip", "source_port", "destination_port", "protocol"]
    for field in required:
        if field not in event:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")

    predictor = get_predictor()
    pred = predictor.predict(event)

    # Save network event
    net_event = NetworkEvent(
        user_id=current_user.id,
        source_ip=event.get("source_ip", ""),
        destination_ip=event.get("destination_ip", ""),
        source_port=int(event.get("source_port", 0)),
        destination_port=int(event.get("destination_port", 0)),
        protocol=event.get("protocol", "TCP"),
        bytes_sent=int(event.get("bytes_sent", 0)),
        bytes_received=int(event.get("bytes_received", 0)),
        duration_ms=float(event.get("duration_ms", 0.0)),
        flags=event.get("flags"),
    )
    db.add(net_event)
    db.flush()

    threat = None
    auto_blocked = False
    if pred.get("threat_type") != "NORMAL":
        threat = Threat(
            user_id=current_user.id,
            network_event_id=net_event.id,
            threat_type=pred["threat_type"],
            severity=pred["severity"],
            risk_score=pred["risk_score"],
            confidence=pred["confidence"],
            source_ip=event.get("source_ip", ""),
            destination_ip=event.get("destination_ip", ""),
            source_port=int(event.get("source_port", 0)),
            destination_port=int(event.get("destination_port", 0)),
            protocol=event.get("protocol", "TCP"),
            ml_model=pred["ml_model"],
            detection_reason=pred["detection_reason"],
            recommended_action=pred["recommended_action"],
        )
        db.add(threat)
        db.flush()
        db.commit()
        db.refresh(threat)
        await send_threat_notification(db, current_user, threat)
        
        # AI Active Defense Auto-Blocking
        auto_blocked = await evaluate_auto_block(db, current_user, threat)
    else:
        db.commit()

    return {
        "prediction": pred,
        "threat": _threat_to_dict(threat) if threat else None,
        "is_threat": threat is not None,
        "auto_blocked": auto_blocked
    }
