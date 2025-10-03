from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import time
from datetime import datetime

from database import get_db
from models.camera import Camera
from models.event import Event
from services.auth_service import AuthService
from services.detection_service import detection_service
from models.user import User

router = APIRouter()

@router.get("/status")
def get_detection_status(
    current_user: User = Depends(AuthService.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Obter status do sistema de detecção"""
    try:
        # Estatísticas das câmeras
        cameras = db.query(Camera).all()
        active_cameras = [c for c in cameras if c.detection_enabled]
        
        # Estatísticas dos eventos (últimas 24 horas)
        yesterday = datetime.now().timestamp() - 86400
        recent_events = db.query(Event).filter(Event.timestamp >= datetime.fromtimestamp(yesterday)).all()
        
        # Eventos por tipo
        event_types = {}
        for event in recent_events:
            event_type = event.event_type
            event_types[event_type] = event_types.get(event_type, 0) + 1
        
        # Status do sistema
        system_status = {
            "total_cameras": len(cameras),
            "active_cameras": len(active_cameras),
            "detection_enabled": len(active_cameras) > 0,
            "recent_events_24h": len(recent_events),
            "event_types": event_types,
            "system_uptime": time.time(),
            "last_update": datetime.now().isoformat()
        }
        
        return system_status
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter status: {str(e)}"
        )

@router.get("/cameras/{camera_id}/status")
def get_camera_detection_status(
    camera_id: int,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Obter status de detecção de uma câmera específica"""
    try:
        camera = db.query(Camera).filter(Camera.id == camera_id).first()
        if not camera:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Câmera não encontrada"
            )
        
        # Verificar se está sendo monitorada
        is_monitored = camera_id in detection_service.active_monitors
        
        # Últimos eventos da câmera
        recent_events = db.query(Event).filter(
            Event.camera_id == camera_id
        ).order_by(Event.timestamp.desc()).limit(5).all()
        
        # Status da câmera
        camera_status = {
            "camera_id": camera_id,
            "name": camera.name,
            "detection_enabled": camera.detection_enabled,
            "is_monitored": is_monitored,
            "sensitivity": camera.sensitivity,
            "has_detection_line": camera.detection_line is not None,
            "has_detection_zone": camera.detection_zone is not None,
            "recent_events": [
                {
                    "id": event.id,
                    "type": event.event_type,
                    "confidence": event.confidence,
                    "timestamp": event.timestamp.isoformat(),
                    "description": event.description
                }
                for event in recent_events
            ],
            "last_update": datetime.now().isoformat()
        }
        
        return camera_status
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter status da câmera: {str(e)}"
        )

@router.get("/events/recent")
def get_recent_events(
    limit: int = 10,
    camera_id: int = None,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Obter eventos recentes"""
    try:
        query = db.query(Event)
        
        if camera_id:
            query = query.filter(Event.camera_id == camera_id)
        
        events = query.order_by(Event.timestamp.desc()).limit(limit).all()
        
        return [
            {
                "id": event.id,
                "camera_id": event.camera_id,
                "event_type": event.event_type,
                "confidence": event.confidence,
                "description": event.description,
                "timestamp": event.timestamp.isoformat(),
                "image_path": event.image_path
            }
            for event in events
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter eventos: {str(e)}"
        )

@router.post("/cameras/{camera_id}/restart")
def restart_camera_detection(
    camera_id: int,
    current_user: User = Depends(AuthService.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Reiniciar detecção de uma câmera"""
    try:
        camera = db.query(Camera).filter(Camera.id == camera_id).first()
        if not camera:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Câmera não encontrada"
            )
        
        # Parar monitoramento atual
        if camera_id in detection_service.active_monitors:
            detection_service.stop_monitoring(camera_id)
        
        # Reiniciar se detecção estiver habilitada
        if camera.detection_enabled:
            detection_service.start_monitoring(camera_id, camera.stream_url)
            return {"message": f"Detecção reiniciada para câmera {camera_id}", "success": True}
        else:
            return {"message": f"Detecção desabilitada para câmera {camera_id}", "success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao reiniciar detecção: {str(e)}"
        )

@router.get("/performance")
def get_detection_performance(
    current_user: User = Depends(AuthService.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Obter métricas de performance do sistema de detecção"""
    try:
        # Estatísticas de performance
        cameras = db.query(Camera).filter(Camera.detection_enabled == True).all()
        
        performance_stats = {
            "active_monitors": len(detection_service.active_monitors),
            "total_cameras_with_detection": len(cameras),
            "tracking_data": {
                camera_id: {
                    "objects_tracked": len(data.get('objects', {})),
                    "frame_count": data.get('frame_count', 0)
                }
                for camera_id, data in detection_service.tracking_data.items()
            },
            "background_subtractors": len(detection_service.bg_subtractors),
            "system_load": {
                "active_threads": len(detection_service.camera_threads),
                "memory_usage": "N/A",  # Implementar se necessário
                "cpu_usage": "N/A"      # Implementar se necessário
            },
            "last_update": datetime.now().isoformat()
        }
        
        return performance_stats
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter performance: {str(e)}"
        )
