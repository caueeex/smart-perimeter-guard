#!/usr/bin/env python3
"""
Script para debugar autenticação
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
from models.user import User
from services.auth_service import AuthService
from sqlalchemy.orm import Session

def debug_auth():
    """Debugar autenticação"""
    print("🔍 Debugando autenticação...")
    
    db = next(get_db())
    
    try:
        # Buscar usuário admin
        admin_user = db.query(User).filter(User.username == "admin").first()
        
        if not admin_user:
            print("❌ Usuário admin não encontrado")
            return False
        
        print(f"✅ Usuário encontrado:")
        print(f"   ID: {admin_user.id}")
        print(f"   Username: {admin_user.username}")
        print(f"   Email: {admin_user.email}")
        print(f"   Hash da senha: {admin_user.hashed_password}")
        print(f"   Ativo: {admin_user.is_active}")
        
        # Testar senhas
        test_passwords = ["admin", "admin123", "password", "123456"]
        
        for password in test_passwords:
            is_valid = AuthService.verify_password(password, admin_user.hashed_password)
            print(f"   Senha '{password}': {'✅ VÁLIDA' if is_valid else '❌ Inválida'}")
        
        # Testar função authenticate_user
        print(f"\n🧪 Testando authenticate_user:")
        for password in test_passwords:
            user = AuthService.authenticate_user(db, "admin", password)
            print(f"   authenticate_user('admin', '{password}'): {'✅ Sucesso' if user else '❌ Falha'}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro no debug: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    debug_auth()
