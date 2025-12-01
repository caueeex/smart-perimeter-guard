"""
Serviço de gerenciamento de câmeras
"""
import os
import logging
import traceback
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from models.camera import Camera
from models.event import Event
from schemas.camera import CameraCreate, CameraUpdate
from services.detection_service import detection_service
from config import settings

logger = logging.getLogger(__name__)


class CameraService:
    """Serviço de gerenciamento de câmeras"""

    @staticmethod
    def create_camera(db: Session, camera: CameraCreate) -> Camera:
        """Criar nova câmera"""
        try:
            # Verificar se nome já existe
            existing_camera = db.query(Camera).filter(Camera.name == camera.name).first()
            if existing_camera:
                logger.warning(f"Tentativa de criar câmera com nome duplicado: {camera.name}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Nome da câmera já existe"
                )

            # Validar campos obrigatórios
            if not camera.name or not camera.name.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Nome da câmera é obrigatório"
                )
            
            if not camera.stream_url or not camera.stream_url.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="URL do stream é obrigatória"
                )

            # Criar câmera
            db_camera = Camera(
                name=camera.name.strip(),
                location=camera.location.strip() if camera.location else None,
                stream_url=camera.stream_url.strip(),
                zone=camera.zone.strip() if camera.zone else None,
                detection_enabled=camera.detection_enabled if camera.detection_enabled is not None else True,
                sensitivity=camera.sensitivity if camera.sensitivity is not None else 50,
                fps=camera.fps if camera.fps is not None else 15,
                resolution=camera.resolution if camera.resolution else "640x480"
            )
            
            db.add(db_camera)
            db.commit()
            db.refresh(db_camera)
            
            logger.info(f"Câmera criada no banco: ID={db_camera.id}, Name={db_camera.name}")
            
            return db_camera
        except HTTPException:
            raise
        except IntegrityError as e:
            db.rollback()
            logger.error(f"Erro de integridade ao criar câmera: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Erro ao criar câmera: {str(e)}"
            )
        except Exception as e:
            db.rollback()
            logger.error(f"Erro inesperado ao criar câmera: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro interno ao criar câmera: {str(e)}"
            )

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
        try:
            db_camera = db.query(Camera).filter(Camera.id == camera_id).first()
            if not db_camera:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Câmera não encontrada"
                )

            # Parar monitoramento
            try:
                detection_service.stop_monitoring(camera_id)
            except Exception as e:
                logger.warning(f"Erro ao parar monitoramento da câmera {camera_id}: {e}")

            # Deletar eventos relacionados primeiro (para evitar erro de Foreign Key)
            # Primeiro, buscar eventos para remover arquivos associados
            events = db.query(Event).filter(Event.camera_id == camera_id).all()
            logger.info(f"Encontrados {len(events)} eventos para deletar da câmera {camera_id}")
            
            # Remover arquivos dos eventos antes de deletar do banco
            for event in events:
                # Remover arquivos associados aos eventos
                # Tratar caminhos relativos (/uploads/...) e absolutos
                if event.image_path:
                    image_path = event.image_path
                    try:
                        # Se for caminho relativo começando com /uploads/
                        if image_path.startswith("/uploads/"):
                            rel_path = image_path[len("/uploads/"):]
                            # Normalizar separadores de caminho para Windows
                            if os.path.sep != '/':
                                rel_path = rel_path.replace('/', os.path.sep)
                            image_path = os.path.join(settings.upload_dir, rel_path)
                        elif not os.path.isabs(image_path):
                            # Caminho relativo sem /uploads/
                            image_path = os.path.join(settings.upload_dir, image_path)
                        
                        if os.path.exists(image_path):
                            os.remove(image_path)
                            logger.debug(f"Imagem removida: {image_path}")
                    except Exception as e:
                        logger.warning(f"Erro ao remover imagem do evento {event.id} ({image_path}): {e}")
                
                if event.video_path:
                    video_path = event.video_path
                    try:
                        # Se for caminho relativo começando com /uploads/
                        if video_path.startswith("/uploads/"):
                            rel_path = video_path[len("/uploads/"):]
                            # Normalizar separadores de caminho para Windows
                            if os.path.sep != '/':
                                rel_path = rel_path.replace('/', os.path.sep)
                            video_path = os.path.join(settings.upload_dir, rel_path)
                        elif not os.path.isabs(video_path):
                            # Caminho relativo sem /uploads/
                            video_path = os.path.join(settings.upload_dir, video_path)
                        
                        if os.path.exists(video_path):
                            os.remove(video_path)
                            logger.debug(f"Vídeo removido: {video_path}")
                    except Exception as e:
                        logger.warning(f"Erro ao remover vídeo do evento {event.id} ({video_path}): {e}")
            
            # Deletar eventos do banco usando delete direto (mais eficiente)
            deleted_count = db.query(Event).filter(Event.camera_id == camera_id).delete()
            logger.info(f"{deleted_count} eventos deletados do banco de dados")
            
            # Fazer commit dos eventos deletados ANTES de deletar a câmera
            if deleted_count > 0:
                db.commit()
                logger.info(f"Commit realizado para {deleted_count} eventos deletados")
            
            # Deletar câmera
            db.delete(db_camera)
            db.commit()
            logger.info(f"Câmera {camera_id} deletada com sucesso")
            return True
            
        except HTTPException:
            # Re-raise HTTP exceptions (como 404)
            raise
        except IntegrityError as e:
            db.rollback()
            error_trace = traceback.format_exc()
            logger.error(f"Erro de integridade ao deletar câmera {camera_id}: {e}")
            logger.error(f"Traceback completo:\n{error_trace}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao deletar câmera: {str(e)}"
            )
        except Exception as e:
            db.rollback()
            error_trace = traceback.format_exc()
            logger.error(f"Erro ao deletar câmera {camera_id}: {e}")
            logger.error(f"Traceback completo:\n{error_trace}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao deletar câmera: {str(e)}"
            )

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
        """Configurar zona de detecção (suporta múltiplas zonas)"""
        db_camera = db.query(Camera).filter(Camera.id == camera_id).first()
        if not db_camera:
            return None

        # Se veio 'zones' (array), usar isso; senão, usar formato antigo (single zone)
        if 'zones' in detection_zone and isinstance(detection_zone['zones'], list):
            # Novo formato: múltiplas zonas
            db_camera.detection_zone = {'zones': detection_zone['zones'], 'ref_w': detection_zone.get('ref_w'), 'ref_h': detection_zone.get('ref_h')}
        else:
            # Formato antigo: zona única (compatibilidade)
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

