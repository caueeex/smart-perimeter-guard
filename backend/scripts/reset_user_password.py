#!/usr/bin/env python3
"""
Script para redefinir senha do usuário admin
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
from models.user import User
from services.auth_service import AuthService
from sqlalchemy.orm import Session

def reset_admin_password():
    """Redefinir senha do usuário admin"""
    print("🔧 Redefinindo senha do usuário admin...")
    
    db = next(get_db())
    
    try:
        # Buscar usuário admin
        admin_user = db.query(User).filter(User.username == "admin").first()
        
        if not admin_user:
            print("❌ Usuário admin não encontrado")
            return False
        
        # Nova senha
        new_password = "admin123"
        hashed_password = AuthService.get_password_hash(new_password)
        
        # Atualizar senha
        admin_user.hashed_password = hashed_password
        db.commit()
        
        print("✅ Senha do usuário admin redefinida com sucesso!")
        print(f"   Username: admin")
        print(f"   Email: {admin_user.email}")
        print(f"   Nova senha: {new_password}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro ao redefinir senha: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = reset_admin_password()
    if success:
        print("\n🎯 Senha redefinida! Agora você pode fazer login com:")
        print("   Username: admin")
        print("   Password: admin123")
    else:
        print("\n❌ Falha ao redefinir senha")
