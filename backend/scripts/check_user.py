#!/usr/bin/env python3
"""
Script para verificar usuários existentes e suas credenciais
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
from models.user import User
from services.auth_service import AuthService
from sqlalchemy.orm import Session

def check_users():
    """Verificar usuários existentes"""
    print("🔍 Verificando usuários existentes...")
    
    db = next(get_db())
    
    try:
        users = db.query(User).all()
        
        if not users:
            print("❌ Nenhum usuário encontrado no banco de dados")
            return False
        
        print(f"✅ Encontrados {len(users)} usuário(s):")
        
        for user in users:
            print(f"\n👤 Usuário:")
            print(f"   ID: {user.id}")
            print(f"   Username: {user.username}")
            print(f"   Email: {user.email}")
            print(f"   Nome: {user.full_name}")
            print(f"   Role: {user.role}")
            print(f"   Ativo: {user.is_active}")
            print(f"   Criado em: {user.created_at}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro ao verificar usuários: {e}")
        return False
    finally:
        db.close()

def test_login_credentials():
    """Testar credenciais de login"""
    print("\n🔐 Testando credenciais de login...")
    
    # Credenciais comuns para testar
    test_credentials = [
        {"username": "admin", "password": "admin"},
        {"username": "admin", "password": "admin123"},
        {"username": "admin", "password": "password"},
        {"username": "admin", "password": "123456"},
        {"username": "admin@test.com", "password": "admin"},
        {"username": "admin@test.com", "password": "admin123"},
    ]
    
    for creds in test_credentials:
        try:
            print(f"\n🧪 Testando: {creds['username']} / {creds['password']}")
            
            # Simular verificação de senha
            db = next(get_db())
            user = db.query(User).filter(User.username == creds['username']).first()
            
            if not user:
                user = db.query(User).filter(User.email == creds['username']).first()
            
            if user:
                is_valid = AuthService.verify_password(creds['password'], user.hashed_password)
                if is_valid:
                    print(f"✅ CREDENCIAIS VÁLIDAS!")
                    print(f"   Use: {creds['username']} / {creds['password']}")
                    return creds
                else:
                    print(f"❌ Senha incorreta")
            else:
                print(f"❌ Usuário não encontrado")
                
            db.close()
            
        except Exception as e:
            print(f"❌ Erro ao testar credenciais: {e}")
    
    return None

if __name__ == "__main__":
    # Verificar usuários
    if check_users():
        # Testar credenciais
        valid_creds = test_login_credentials()
        
        if valid_creds:
            print(f"\n🎯 Use estas credenciais para fazer login:")
            print(f"   Username: {valid_creds['username']}")
            print(f"   Password: {valid_creds['password']}")
        else:
            print(f"\n❌ Nenhuma credencial válida encontrada")
            print(f"   Você pode precisar redefinir a senha ou criar um novo usuário")
