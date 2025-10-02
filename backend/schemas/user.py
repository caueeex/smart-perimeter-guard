"""
Schemas de usuário
"""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from models.user import UserRole


class UserBase(BaseModel):
    """Schema base de usuário"""
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    role: UserRole = UserRole.USER


class UserCreate(UserBase):
    """Schema para criação de usuário"""
    password: str


class UserUpdate(BaseModel):
    """Schema para atualização de usuário"""
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserInDB(UserBase):
    """Schema de usuário no banco"""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class User(UserInDB):
    """Schema de usuário para resposta"""
    pass


class UserLogin(BaseModel):
    """Schema para login"""
    email: EmailStr
    password: str


class Token(BaseModel):
    """Schema de token"""
    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Schema de dados do token"""
    email: Optional[str] = None

