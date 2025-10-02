"""
Serviço de autenticação
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from models.user import User
from schemas.user import UserCreate, UserLogin, TokenData
from config import settings
from database import get_db

# Configuração de hash de senha
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Configuração de autenticação
security = HTTPBearer()


class AuthService:
    """Serviço de autenticação"""

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verificar senha"""
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def get_password_hash(password: str) -> str:
        """Gerar hash da senha"""
        # Truncar senha para 72 bytes (limite do bcrypt)
        password = password[:72]
        return pwd_context.hash(password)

    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
        """Criar token de acesso"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(
                minutes=settings.access_token_expire_minutes
            )
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(
            to_encode, settings.secret_key, algorithm=settings.algorithm
        )
        return encoded_jwt

    @staticmethod
    def verify_token(token: str, credentials_exception):
        """Verificar token"""
        try:
            payload = jwt.decode(
                token, settings.secret_key, algorithms=[settings.algorithm]
            )
            email: str = payload.get("sub")
            if email is None:
                raise credentials_exception
            token_data = TokenData(email=email)
        except JWTError:
            raise credentials_exception
        return token_data

    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        """Autenticar usuário"""
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return None
        if not AuthService.verify_password(password, user.hashed_password):
            return None
        return user

    @staticmethod
    def create_user(db: Session, user: UserCreate) -> User:
        """Criar novo usuário"""
        # Verificar se email já existe
        if db.query(User).filter(User.email == user.email).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email já cadastrado"
            )
        
        # Verificar se username já existe
        if db.query(User).filter(User.username == user.username).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username já cadastrado"
            )

        # Criar usuário
        hashed_password = AuthService.get_password_hash(user.password)
        db_user = User(
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            role=user.role,
            hashed_password=hashed_password
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    @staticmethod
    def get_current_user(
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: Session = Depends(get_db)
    ) -> User:
        """Obter usuário atual"""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        token = credentials.credentials
        token_data = AuthService.verify_token(token, credentials_exception)
        
        user = db.query(User).filter(User.email == token_data.email).first()
        if user is None:
            raise credentials_exception
        return user

    @staticmethod
    def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
        """Obter usuário ativo atual"""
        if not current_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
        return current_user

    @staticmethod
    def get_current_admin_user(current_user: User = Depends(get_current_active_user)) -> User:
        """Obter usuário admin atual"""
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user

