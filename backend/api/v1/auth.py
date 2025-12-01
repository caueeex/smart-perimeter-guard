"""
Endpoints de autenticação
"""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from database import get_db
from schemas.user import User, UserCreate, UserUpdate, Token
from services.auth_service import AuthService
from config import settings

router = APIRouter()


@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """Registrar novo usuário"""
    return AuthService.create_user(db, user)


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Fazer login"""
    user = AuthService.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = AuthService.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=User)
def read_users_me(current_user: User = Depends(AuthService.get_current_active_user)):
    """Obter dados do usuário atual"""
    return current_user


@router.put("/me", response_model=User)
def update_users_me(
    user_update: UserUpdate,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Atualizar dados do usuário atual"""
    # Não permitir alterar role ou is_active pelo próprio usuário
    user_update.role = None
    user_update.is_active = None
    
    updated_user = AuthService.update_user(db, current_user.id, user_update)
    return updated_user

