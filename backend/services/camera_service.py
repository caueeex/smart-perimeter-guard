"""
Serviço de gerenciamento de câmeras
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from models.camera import Camera
from schemas.camera import CameraCreate, CameraUpdate
from services.detection_service import detection_service


class CameraService:
    """Serviço de gerenciamento de câmeras"""

    @staticmethod
    def create_camera(db: Session, camera: CameraCreate) -> Camera:
        """Criar nova câmera"""
        # Verificar se nome já existe
        if db.query(Camera).filter(Camera.name == camera.name).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nome da câmera já existe"
            )

        # Criar câmera
        db_camera = Camera(
            name=camera.name,
            location=camera.location,
            stream_url=camera.stream_url,
            zone=camera.zone,
            detection_enabled=camera.detection_enabled,
            sensitivity=camera.sensitivity,
            fps=camera.fps,
            resolution=camera.resolution
        )
        
        db.add(db_camera)
        db.commit()
        db.refresh(db_camera)
        
        # Iniciar monitoramento se detecção estiver habilitada
        if camera.detection_enabled:
            detection_service.start_monitoring(db_camera.id, camera.stream_url)
        
        return db_camera

    @staticmethod
    def get_camera(db: Session, camera_id: int) -> Optional[Camera]:
        """Obter câmera por ID"""
        return db.query(Camera).filter(Camera.id == camera_id).first()

    @staticmethod
    def get_cameras(db: Session, skip: int = 0, limit: int = 100) -> List[Camera]:
        """Obter lista de câmeras"""
        return db.query(Camera).offset(skip).limit(limit).all()

    @staticmethod
    def update_camera(db: Session, camera_id: int, camera_update: CameraUpdate) -> Optional[Camera]:
        """Atualizar câmera"""
        db_camera = db.query(Camera).filter(Camera.id == camera_id).first()
        if not db_camera:
            return None

        # Atualizar campos
        update_data = camera_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_camera, field, value)

        db.commit()
        db.refresh(db_camera)

        # Reiniciar monitoramento se necessário
        if "detection_enabled" in update_data or "stream_url" in update_data:
            if db_camera.detection_enabled:
                detection_service.start_monitoring(db_camera.id, db_camera.stream_url)
            else:
                detection_service.stop_monitoring(db_camera.id)

        return db_camera

    @staticmethod
    def delete_camera(db: Session, camera_id: int) -> bool:
        """Deletar câmera"""
        db_camera = db.query(Camera).filter(Camera.id == camera_id).first()
        if not db_camera:
            return False

        # Parar monitoramento
        detection_service.stop_monitoring(camera_id)

        # Deletar câmera
        db.delete(db_camera)
        db.commit()
        return True

    @staticmethod
    def update_camera_status(db: Session, camera_id: int, status: str) -> Optional[Camera]:
        """Atualizar status da câmera"""
        db_camera = db.query(Camera).filter(Camera.id == camera_id).first()
        if not db_camera:
            return None

        db_camera.status = status
        db.commit()
        db.refresh(db_camera)
        return db_camera

    @staticmethod
    def configure_detection_line(db: Session, camera_id: int, detection_line: dict) -> Optional[Camera]:
        """Configurar linha de detecção"""
        db_camera = db.query(Camera).filter(Camera.id == camera_id).first()
        if not db_camera:
            return None

        db_camera.detection_line = detection_line
        db.commit()
        db.refresh(db_camera)
        return db_camera

    @staticmethod
    def configure_detection_zone(db: Session, camera_id: int, detection_zone: dict) -> Optional[Camera]:
        """Configurar zona de detecção"""
        db_camera = db.query(Camera).filter(Camera.id == camera_id).first()
        if not db_camera:
            return None

        db_camera.detection_zone = detection_zone
        db.commit()
        db.refresh(db_camera)
        return db_camera

    @staticmethod
    def get_camera_stats(db: Session) -> dict:
        """Obter estatísticas das câmeras"""
        total_cameras = db.query(Camera).count()
        online_cameras = db.query(Camera).filter(Camera.status == "online").count()
        offline_cameras = db.query(Camera).filter(Camera.status == "offline").count()
        maintenance_cameras = db.query(Camera).filter(Camera.status == "maintenance").count()
        detection_enabled = db.query(Camera).filter(Camera.detection_enabled == True).count()

        return {
            "total_cameras": total_cameras,
            "online_cameras": online_cameras,
            "offline_cameras": offline_cameras,
            "maintenance_cameras": maintenance_cameras,
            "detection_enabled": detection_enabled,
            "detection_disabled": total_cameras - detection_enabled
        }

