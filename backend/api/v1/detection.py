from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any
import json
import cv2
from datetime import datetime

from database import get_db
from models.camera import Camera
from services.auth_service import AuthService
from services.detection_service import detection_service
from models.user import User

router = APIRouter()

@router.post("/line/{camera_id}")
def configure_detection_line(
    camera_id: int,
    line_config: Dict[str, Any],
    current_user: User = Depends(AuthService.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Configurar linha de detecção"""
    try:
        camera = db.query(Camera).filter(Camera.id == camera_id).first()
        if not camera:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Câmera não encontrada"
            )
        
        # Salvar configuração da linha
        camera.detection_line = json.dumps(line_config)
        db.commit()
        
        return {"message": "Linha de detecção configurada com sucesso", "success": True}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao configurar linha de detecção: {str(e)}"
        )

@router.post("/zone/{camera_id}")
def configure_detection_zone(
    camera_id: int,
    zone_config: Dict[str, Any],
    current_user: User = Depends(AuthService.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Configurar zona de detecção"""
    try:
        camera = db.query(Camera).filter(Camera.id == camera_id).first()
        if not camera:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Câmera não encontrada"
            )
        
        # Salvar configuração da zona
        camera.detection_zone = json.dumps(zone_config)
        db.commit()
        
        return {"message": "Zona de detecção configurada com sucesso", "success": True}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao configurar zona de detecção: {str(e)}"
        )

@router.get("/config/{camera_id}")
def get_detection_config(
    camera_id: int,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Obter configuração de detecção da câmera"""
    try:
        camera = db.query(Camera).filter(Camera.id == camera_id).first()
        if not camera:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Câmera não encontrada"
            )
        
        config = {
            "detection_enabled": camera.detection_enabled,
            "sensitivity": camera.sensitivity,
            "detection_line": json.loads(camera.detection_line) if camera.detection_line else None,
            "detection_zone": json.loads(camera.detection_zone) if camera.detection_zone else None
        }
        
        return config
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter configuração: {str(e)}"
        )

@router.post("/toggle/{camera_id}")
def toggle_detection(
    camera_id: int,
    request_data: dict,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Ativar/desativar detecção"""
    try:
        camera = db.query(Camera).filter(Camera.id == camera_id).first()
        if not camera:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Câmera não encontrada"
            )
        
        enabled = request_data.get('enabled', False)
        camera.detection_enabled = enabled
        db.commit()
        
        status_text = "ativada" if enabled else "desativada"
        return {"message": f"Detecção {status_text} com sucesso", "success": True}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao alterar status da detecção: {str(e)}"
        )

@router.post("/test/{camera_id}")
def test_detection(
    camera_id: int,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Testar detecção manualmente para uma câmera"""
    try:
        # Verificar se câmera existe
        camera = db.query(Camera).filter(Camera.id == camera_id).first()
        if not camera:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Câmera não encontrada"
            )
        
        # Verificar se modelo YOLO está carregado
        if not detection_service.is_model_loaded():
            return {
                "success": False,
                "error": "Modelo YOLO não está carregado",
                "model_loaded": False,
                "camera_info": {
                    "id": camera.id,
                    "name": camera.name,
                    "stream_url": camera.stream_url,
                    "detection_enabled": camera.detection_enabled
                }
            }
        
        # Tentar capturar um frame da câmera
        cap = None
        try:
            if camera.stream_url.startswith("webcam://"):
                camera_index = int(camera.stream_url.split("://")[1])
                cap = cv2.VideoCapture(camera_index)
            else:
                cap = cv2.VideoCapture(camera.stream_url)
            
            if not cap.isOpened():
                return {
                    "success": False,
                    "error": "Não foi possível conectar à câmera",
                    "model_loaded": True,
                    "camera_connected": False,
                    "camera_info": {
                        "id": camera.id,
                        "name": camera.name,
                        "stream_url": camera.stream_url
                    }
                }
            
            # Capturar frame
            ret, frame = cap.read()
            if not ret:
                return {
                    "success": False,
                    "error": "Não foi possível ler frame da câmera",
                    "model_loaded": True,
                    "camera_connected": True,
                    "frame_captured": False
                }
            
            # Testar detecção YOLO usando método público
            sensitivity = camera.sensitivity / 100.0
            objects = detection_service.test_detection(frame, sensitivity)
            
            # Testar verificação de intrusão
            has_line = camera.detection_line is not None
            has_zone = camera.detection_zone is not None
            intrusion_detected = False
            
            if objects:
                # Converter objetos para formato esperado pelo tracking
                tracked_objects = detection_service.test_tracking(frame, camera_id, objects)
                if tracked_objects:
                    intrusion_detected = detection_service.test_intrusion_check(
                        frame, tracked_objects, camera.detection_line, camera.detection_zone
                    )
            
            return {
                "success": True,
                "model_loaded": True,
                "camera_connected": True,
                "frame_captured": True,
                "detection_results": {
                    "objects_detected": len(objects),
                    "objects": [
                        {
                            "class": obj["class"],
                            "confidence": round(obj["confidence"], 2),
                            "area": obj["area"],
                            "center": obj["center"]
                        }
                        for obj in objects
                    ],
                    "intrusion_detected": intrusion_detected,
                    "has_detection_line": has_line,
                    "has_detection_zone": has_zone,
                    "mode": "basic" if (not has_line and not has_zone) else "advanced"
                },
                "camera_info": {
                    "id": camera.id,
                    "name": camera.name,
                    "sensitivity": camera.sensitivity,
                    "detection_enabled": camera.detection_enabled
                },
                "timestamp": datetime.now().isoformat()
            }
            
        finally:
            if cap:
                cap.release()
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao testar detecção: {str(e)}"
        )

@router.get("/health")
def detection_health():
    """Estado do modelo de detecção para diagnóstico (sem auth para facilitar teste)."""
    try:
        loaded = False
        errors = None
        try:
            loaded = detection_service.is_model_loaded()
        except Exception as e:
            errors = str(e)
        return {"model_loaded": loaded, "errors": errors}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
