from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any
import json

from database import get_db
from models.camera import Camera
from services.auth_service import AuthService
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
