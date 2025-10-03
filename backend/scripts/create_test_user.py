#!/usr/bin/env python3
"""
Script para criar usuário de teste no banco de dados
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
from models.user import User
from services.auth_service import AuthService
from sqlalchemy.orm import Session

def create_test_user():
    """Criar usuário de teste"""
    print("🔐 Criando usuário de teste...")
    
    db = next(get_db())
    
    try:
        # Verificar se usuário já existe
        existing_user = db.query(User).filter(User.email == "admin@test.com").first()
        if existing_user:
            print("ℹ️ Usuário admin@test.com já existe")
            return True
        
        # Criar novo usuário
        user_data = {
            "username": "admin",
            "email": "admin@test.com",
            "password": "admin123",
            "full_name": "Administrador",
            "role": "admin"
        }
        
        # Hash da senha
        hashed_password = AuthService.get_password_hash(user_data["password"])
        
        # Criar usuário
        new_user = User(
            username=user_data["username"],
            email=user_data["email"],
            hashed_password=hashed_password,
            full_name=user_data["full_name"],
            role=user_data["role"],
            is_active=True
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        print("✅ Usuário de teste criado com sucesso!")
        print(f"   Email: {new_user.email}")
        print(f"   Username: {new_user.username}")
        print(f"   Senha: admin123")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro ao criar usuário: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = create_test_user()
    if success:
        print("\n🎯 Usuário de teste pronto para uso!")
    else:
        print("\n❌ Falha ao criar usuário de teste")
