#!/usr/bin/env python3
"""
Script para verificar câmeras no banco de dados
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
from models.camera import Camera
from sqlalchemy.orm import Session

def check_cameras_in_db():
    """Verificar câmeras cadastradas no banco"""
    print("🔍 Verificando câmeras no banco de dados...")
    
    db = next(get_db())
    
    try:
        cameras = db.query(Camera).all()
        
        if not cameras:
            print("❌ Nenhuma câmera encontrada no banco de dados")
            return False
        
        print(f"✅ Encontradas {len(cameras)} câmera(s):")
        
        for camera in cameras:
            print(f"\n📹 Câmera ID: {camera.id}")
            print(f"   Nome: {camera.name}")
            print(f"   URL: {camera.stream_url}")
            print(f"   Localização: {camera.location}")
            print(f"   Status: {camera.status}")
            print(f"   Detecção: {camera.detection_enabled}")
            print(f"   Criada em: {camera.created_at}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro ao verificar câmeras: {e}")
        return False
    finally:
        db.close()

def test_camera_stream():
    """Testar stream da câmera cadastrada"""
    print("\n🧪 Testando stream da câmera cadastrada...")
    
    db = next(get_db())
    
    try:
        camera = db.query(Camera).first()
        
        if not camera:
            print("❌ Nenhuma câmera para testar")
            return False
        
        print(f"📹 Testando câmera: {camera.name}")
        print(f"   URL: {camera.stream_url}")
        
        import cv2
        
        if camera.stream_url.startswith("webcam://"):
            camera_index = int(camera.stream_url.split("://")[1])
            cap = cv2.VideoCapture(camera_index)
        else:
            cap = cv2.VideoCapture(camera.stream_url)
        
        if cap.isOpened():
            print("✅ Câmera pode ser aberta")
            
            # Tentar ler frame
            ret, frame = cap.read()
            if ret:
                print("✅ Frame lido com sucesso")
                print(f"   Resolução: {frame.shape}")
                cap.release()
                return True
            else:
                print("❌ Não conseguiu ler frame")
        else:
            print("❌ Não conseguiu abrir câmera")
        
        cap.release()
        return False
        
    except Exception as e:
        print(f"❌ Erro ao testar stream: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    if check_cameras_in_db():
        test_camera_stream()
