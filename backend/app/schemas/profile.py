from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    timezone: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

class ProfileResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: Optional[str]
    phone: Optional[str]
    avatar_url: Optional[str]
    timezone: str

    class Config:
        from_attributes = True
