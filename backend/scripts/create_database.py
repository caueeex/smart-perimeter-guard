"""
Script para criar banco de dados e tabelas
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import create_tables, engine
from models.user import User, UserRole
from models.camera import Camera
from models.event import Event
from services.auth_service import AuthService
from sqlalchemy.orm import sessionmaker
from config import settings

def create_database():
    """Criar banco de dados e tabelas"""
    print("Criando banco de dados...")
    
    try:
        # Criar tabelas
        create_tables()
        print("Tabelas criadas com sucesso")
        
        # Criar usuário admin padrão
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        # Verificar se já existe usuário admin
        admin_user = db.query(User).filter(User.email == "admin@securevision.com").first()
        
        if not admin_user:
            # Criar usuário admin
            admin_user = User(
                email="admin@securevision.com",
                username="admin",
                full_name="Administrador",
                role=UserRole.ADMIN,
                hashed_password=AuthService.get_password_hash("admin123"),
                is_active=True
            )
            
            db.add(admin_user)
            db.commit()
            print("Usuario admin criado (email: admin@securevision.com, senha: admin123)")
        else:
            print("Usuario admin ja existe")
        
        # Criar usuário comum de teste
        test_user = db.query(User).filter(User.email == "user@securevision.com").first()
        
        if not test_user:
            test_user = User(
                email="user@securevision.com",
                username="user",
                full_name="Usuario Teste",
                role=UserRole.USER,
                hashed_password=AuthService.get_password_hash("user123"),
                is_active=True
            )
            
            db.add(test_user)
            db.commit()
            print("Usuario teste criado (email: user@securevision.com, senha: user123)")
        else:
            print("Usuario teste ja existe")
        
        # Criar câmeras de exemplo
        cameras = [
            {
                "name": "Câmera Entrada Principal",
                "location": "Entrada Principal",
                "stream_url": "rtsp://admin:admin@192.168.1.100:554/stream1",
                "zone": "A1",
                "detection_enabled": True,
                "sensitivity": 70,
                "fps": 15,
                "resolution": "640x480"
            },
            {
                "name": "Câmera Estacionamento",
                "location": "Estacionamento",
                "stream_url": "rtsp://admin:admin@192.168.1.101:554/stream1",
                "zone": "B1",
                "detection_enabled": True,
                "sensitivity": 60,
                "fps": 15,
                "resolution": "640x480"
            },
            {
                "name": "Câmera Corredor A",
                "location": "Corredor A",
                "stream_url": "rtsp://admin:admin@192.168.1.102:554/stream1",
                "zone": "A2",
                "detection_enabled": False,
                "sensitivity": 50,
                "fps": 15,
                "resolution": "640x480"
            }
        ]
        
        for camera_data in cameras:
            existing_camera = db.query(Camera).filter(Camera.name == camera_data["name"]).first()
            
            if not existing_camera:
                camera = Camera(**camera_data)
                db.add(camera)
                print(f"Camera criada: {camera_data['name']}")
            else:
                print(f"Camera ja existe: {camera_data['name']}")
        
        db.commit()
        db.close()
        
        print("Banco de dados configurado com sucesso!")
        print("\nCredenciais de acesso:")
        print("   Admin: admin@securevision.com / admin123")
        print("   User:  user@securevision.com / user123")
        
    except Exception as e:
        print(f"Erro ao criar banco de dados: {e}")
        return False
    
    return True

if __name__ == "__main__":
    create_database()

