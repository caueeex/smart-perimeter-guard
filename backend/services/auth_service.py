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
    def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
        """Autenticar usuário"""
        # Tentar buscar por username primeiro
        user = db.query(User).filter(User.username == username).first()
        
        # Se não encontrar por username, tentar por email
        if not user:
            user = db.query(User).filter(User.email == username).first()
        
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
    def update_user(db: Session, user_id: int, user_update) -> User:
        """Atualizar usuário"""
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuário não encontrado"
            )
        
        # Verificar se email já existe (se estiver sendo alterado)
        if user_update.email and user_update.email != user.email:
            existing_user = db.query(User).filter(User.email == user_update.email).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email já cadastrado"
                )
        
        # Verificar se username já existe (se estiver sendo alterado)
        if user_update.username and user_update.username != user.username:
            existing_user = db.query(User).filter(User.username == user_update.username).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username já cadastrado"
                )
        
        # Atualizar campos
        if user_update.email is not None:
            user.email = user_update.email
        if user_update.username is not None:
            user.username = user_update.username
        if user_update.full_name is not None:
            user.full_name = user_update.full_name
        if user_update.is_active is not None:
            user.is_active = user_update.is_active
        
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def get_current_user_optional(
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
        db: Session = Depends(get_db)
    ) -> Optional[User]:
        """Obter usuário atual opcionalmente (não lança exceção se não autenticado)"""
        if not credentials:
            return None
        
        try:
            token = credentials.credentials
            # Usar verify_token mas sem lançar exceção
            credentials_exception = HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
            token_data = AuthService.verify_token(token, credentials_exception)
            
            # Buscar usuário por email (como em get_current_user)
            user = db.query(User).filter(User.email == token_data.email).first()
            if user is None:
                return None
            return user if user.is_active else None
        except (JWTError, HTTPException):
            return None

    @staticmethod
    def get_current_active_user_optional(
        current_user: Optional[User] = Depends(get_current_user_optional)
    ) -> Optional[User]:
        """Obter usuário ativo atual opcionalmente"""
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

