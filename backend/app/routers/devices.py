from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.device import Device
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceResponse
import uuid

router = APIRouter(prefix="/devices", tags=["devices"])

@router.get("", response_model=list[DeviceResponse])
def list_devices(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Device).filter(Device.user_id == current_user.id).all()

@router.post("", response_model=DeviceResponse)
def create_device(req: DeviceCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    dev = Device(user_id=current_user.id, **req.dict())
    db.add(dev)
    db.commit()
    db.refresh(dev)
    return dev

@router.get("/{device_id}", response_model=DeviceResponse)
def get_device(device_id: uuid.UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    dev = db.query(Device).filter(Device.id == device_id, Device.user_id == current_user.id).first()
    if not dev: raise HTTPException(404, "Device not found")
    return dev
