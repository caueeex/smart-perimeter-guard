"""
Endpoints de câmeras
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from schemas.camera import Camera, CameraCreate, CameraUpdate, DetectionLineConfig, DetectionZoneConfig
from schemas.user import User
from services.camera_service import CameraService
from services.auth_service import AuthService

router = APIRouter()


@router.post("/", response_model=Camera, status_code=status.HTTP_201_CREATED)
def create_camera(
    camera: CameraCreate,
    db: Session = Depends(get_db),
    # Permitir que qualquer usuário autenticado crie câmera
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Criar nova câmera"""
    return CameraService.create_camera(db, camera)


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
    camera = CameraService.configure_detection_zone(
        db, camera_id, detection_zone.dict()
    )
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Câmera não encontrada"
        )
    return {"message": "Zona de detecção configurada com sucesso"}


@router.get("/stats/summary")
def get_camera_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Obter estatísticas das câmeras"""
    return CameraService.get_camera_stats(db)

