#!/usr/bin/env python3
"""
Script para debugar API de câmeras
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
from models.camera import Camera
from sqlalchemy.orm import Session

def debug_cameras_api():
    """Debugar API de câmeras"""
    print("🔍 Debugando API de câmeras...")
    
    db = next(get_db())
    
    try:
        # Testar query direta
        print("\n1. Testando query direta...")
        cameras = db.query(Camera).all()
        print(f"✅ Query direta funcionando: {len(cameras)} câmeras")
        
        for camera in cameras:
            print(f"   - ID: {camera.id}, Nome: {camera.name}")
        
        # Testar serialização
        print("\n2. Testando serialização...")
        from schemas.camera import Camera as CameraSchema
        
        for camera in cameras:
            try:
                camera_dict = {
                    "id": camera.id,
                    "name": camera.name,
                    "location": camera.location,
                    "stream_url": camera.stream_url,
                    "zone": camera.zone,
                    "status": camera.status.value if hasattr(camera.status, 'value') else str(camera.status),
                    "detection_enabled": camera.detection_enabled,
                    "detection_line": camera.detection_line,
                    "detection_zone": camera.detection_zone,
                    "sensitivity": camera.sensitivity,
                    "fps": camera.fps,
                    "resolution": camera.resolution,
                    "created_at": camera.created_at.isoformat() if camera.created_at else None,
                    "updated_at": camera.updated_at.isoformat() if camera.updated_at else None
                }
                print(f"✅ Serialização OK para câmera {camera.id}")
            except Exception as e:
                print(f"❌ Erro na serialização da câmera {camera.id}: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro no debug: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    debug_cameras_api()
