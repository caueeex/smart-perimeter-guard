"""
Endpoints de câmeras
"""
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from schemas.camera import Camera, CameraCreate, CameraUpdate, DetectionLineConfig, DetectionZoneConfig
from schemas.user import User
from services.camera_service import CameraService
from services.auth_service import AuthService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/", response_model=Camera, status_code=status.HTTP_201_CREATED)
def create_camera(
    camera: CameraCreate,
    db: Session = Depends(get_db),
    # Permitir que qualquer usuário autenticado crie câmera
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Criar nova câmera"""
    try:
        logger.info(f"Criando câmera: name={camera.name}, stream_url={camera.stream_url}, detection_enabled={camera.detection_enabled}")
        created_camera = CameraService.create_camera(db, camera)
        logger.info(f"Câmera criada com sucesso: ID={created_camera.id}")
        
        # Se detecção estiver habilitada, iniciar monitoramento com email do usuário
        if created_camera.detection_enabled and created_camera.stream_url:
            from services.detection_service import detection_service
            detection_service.start_monitoring(created_camera.id, created_camera.stream_url, current_user.email)
            logger.info(f"Monitoramento iniciado para câmera {created_camera.id} com email {current_user.email}")
        
        return created_camera
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"Erro ao criar câmera: {e}\n{error_details}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao criar câmera: {str(e)}"
        )


@router.get("/", response_model=List[Camera])
def get_cameras(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Obter lista de câmeras"""
    return CameraService.get_cameras(db, skip=skip, limit=limit)


@router.get("/{camera_id}", response_model=Camera)
def get_camera(
    camera_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Obter câmera por ID"""
    camera = CameraService.get_camera(db, camera_id)
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Câmera não encontrada"
        )
    return camera


@router.put("/{camera_id}", response_model=Camera)
def update_camera(
    camera_id: int,
    camera_update: CameraUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_admin_user)
):
    """Atualizar câmera"""
    camera = CameraService.update_camera(db, camera_id, camera_update)
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Câmera não encontrada"
        )
    # Se detecção foi habilitada ou stream foi atualizado, reiniciar com email do usuário
    if camera.detection_enabled and camera.stream_url:
        from services.detection_service import detection_service
        if camera_id in detection_service.active_monitors:
            detection_service.stop_monitoring(camera_id)
        detection_service.start_monitoring(camera_id, camera.stream_url, current_user.email)
    return camera


@router.delete("/{camera_id}")
def delete_camera(
    camera_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_admin_user)
):
    """Deletar câmera"""
    CameraService.delete_camera(db, camera_id)
    return {"message": "Câmera deletada com sucesso"}


@router.post("/{camera_id}/configure-line")
def configure_detection_line(
    camera_id: int,
    detection_line: DetectionLineConfig,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_admin_user)
):
    """Configurar linha de detecção"""
    camera = CameraService.configure_detection_line(
        db, camera_id, detection_line.dict()
    )
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Câmera não encontrada"
        )
    return {"message": "Linha de detecção configurada com sucesso"}


@router.post("/{camera_id}/configure-zone")
def configure_detection_zone(
    camera_id: int,
    detection_zone: DetectionZoneConfig,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_admin_user)
):
    """Configurar zona de detecção"""
    try:
        camera = CameraService.configure_detection_zone(
            db, camera_id, detection_zone.dict()
        )
        if not camera:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Câmera não encontrada"
            )
        return {"message": "Zona de detecção configurada com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao configurar zona de detecção: {str(e)}. Detalhes: {error_details}"
        )


@router.get("/stats/summary")
def get_camera_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Obter estatísticas das câmeras"""
    return CameraService.get_camera_stats(db)

