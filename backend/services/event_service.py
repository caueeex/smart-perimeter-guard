"""
Serviço de gerenciamento de eventos
"""
import os
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from fastapi import HTTPException, status

from models.event import Event, EventType
from models.camera import Camera
from schemas.event import EventCreate, EventUpdate, EventStats


class EventService:
    """Serviço de gerenciamento de eventos"""

    @staticmethod
    def create_event(db: Session, event: EventCreate) -> Event:
        """Criar novo evento"""
        db_event = Event(
            camera_id=event.camera_id,
            event_type=event.event_type,
            description=event.description,
            confidence=event.confidence,
            detected_objects=event.detected_objects,
            bounding_boxes=event.bounding_boxes
        )
        
        db.add(db_event)
        db.commit()
        db.refresh(db_event)
        return db_event

    @staticmethod
    def get_event(db: Session, event_id: int) -> Optional[Event]:
        """Obter evento por ID"""
        return db.query(Event).filter(Event.id == event_id).first()

    @staticmethod
    def get_events(
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        camera_id: Optional[int] = None,
        event_type: Optional[EventType] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Event]:
        """Obter lista de eventos com filtros"""
        query = db.query(Event)
        
        if camera_id:
            query = query.filter(Event.camera_id == camera_id)
        
        if event_type:
            query = query.filter(Event.event_type == event_type)
        
        if start_date:
            query = query.filter(Event.timestamp >= start_date)
        
        if end_date:
            query = query.filter(Event.timestamp <= end_date)
        
        return query.order_by(desc(Event.timestamp)).offset(skip).limit(limit).all()

    @staticmethod
    def update_event(db: Session, event_id: int, event_update: EventUpdate) -> Optional[Event]:
        """Atualizar evento"""
        db_event = db.query(Event).filter(Event.id == event_id).first()
        if not db_event:
            return None

        update_data = event_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_event, field, value)

        db.commit()
        db.refresh(db_event)
        return db_event

    @staticmethod
    def delete_event(db: Session, event_id: int) -> bool:
        """Deletar evento"""
        db_event = db.query(Event).filter(Event.id == event_id).first()
        if not db_event:
            return False

        # Remover arquivos associados
        if db_event.image_path and os.path.exists(db_event.image_path):
            os.remove(db_event.image_path)
        
        if db_event.video_path and os.path.exists(db_event.video_path):
            os.remove(db_event.video_path)

        db.delete(db_event)
        db.commit()
        return True

    @staticmethod
    def get_event_stats(db: Session) -> EventStats:
        """Obter estatísticas de eventos"""
        # Total de eventos
        total_events = db.query(Event).count()
        
        # Eventos hoje
        today = datetime.now().date()
        events_today = db.query(Event).filter(
            func.date(Event.timestamp) == today
        ).count()
        
        # Eventos esta semana
        week_start = today - timedelta(days=today.weekday())
        events_this_week = db.query(Event).filter(
            func.date(Event.timestamp) >= week_start
        ).count()
        
        # Eventos este mês
        month_start = today.replace(day=1)
        events_this_month = db.query(Event).filter(
            func.date(Event.timestamp) >= month_start
        ).count()
        
        # Contagem por tipo
        intrusion_count = db.query(Event).filter(
            Event.event_type == EventType.INTRUSION
        ).count()
        
        movement_count = db.query(Event).filter(
            Event.event_type == EventType.MOVEMENT
        ).count()
        
        alert_count = db.query(Event).filter(
            Event.event_type == EventType.ALERT
        ).count()
        
        # Câmera mais ativa
        most_active_camera = db.query(
            Camera.name,
            func.count(Event.id).label('event_count')
        ).join(Event).group_by(Camera.id).order_by(
            desc('event_count')
        ).first()
        
        # Hora de pico
        peak_hour = db.query(
            func.hour(Event.timestamp).label('hour'),
            func.count(Event.id).label('event_count')
        ).group_by('hour').order_by(desc('event_count')).first()
        
        return EventStats(
            total_events=total_events,
            events_today=events_today,
            events_this_week=events_this_week,
            events_this_month=events_this_month,
            intrusion_count=intrusion_count,
            movement_count=movement_count,
            alert_count=alert_count,
            most_active_camera=most_active_camera[0] if most_active_camera else None,
            peak_hour=most_active_camera[0] if peak_hour else None
        )

    @staticmethod
    def get_events_by_camera(db: Session, camera_id: int, limit: int = 50) -> List[Event]:
        """Obter eventos por câmera"""
        return db.query(Event).filter(
            Event.camera_id == camera_id
        ).order_by(desc(Event.timestamp)).limit(limit).all()

    @staticmethod
    def get_recent_events(db: Session, limit: int = 10) -> List[Event]:
        """Obter eventos recentes"""
        return db.query(Event).order_by(desc(Event.timestamp)).limit(limit).all()

    @staticmethod
    def mark_event_as_notified(db: Session, event_id: int) -> bool:
        """Marcar evento como notificado"""
        db_event = db.query(Event).filter(Event.id == event_id).first()
        if not db_event:
            return False

        db_event.is_notified = True
        db.commit()
        return True

    @staticmethod
    def get_unnotified_events(db: Session) -> List[Event]:
        """Obter eventos não notificados"""
        return db.query(Event).filter(
            Event.is_notified == False
        ).order_by(Event.timestamp).all()

    @staticmethod
    def export_events(
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        camera_id: Optional[int] = None,
        event_type: Optional[EventType] = None
    ) -> List[Dict[str, Any]]:
        """Exportar eventos para relatório"""
        query = db.query(Event).join(Camera)
        
        if start_date:
            query = query.filter(Event.timestamp >= start_date)
        
        if end_date:
            query = query.filter(Event.timestamp <= end_date)
        
        if camera_id:
            query = query.filter(Event.camera_id == camera_id)
        
        if event_type:
            query = query.filter(Event.event_type == event_type)
        
        events = query.order_by(desc(Event.timestamp)).all()
        
        # Converter para formato de exportação
        export_data = []
        for event in events:
            export_data.append({
                'id': event.id,
                'timestamp': event.timestamp.isoformat(),
                'camera_name': event.camera.name,
                'event_type': event.event_type,
                'description': event.description,
                'confidence': event.confidence,
                'detected_objects': event.detected_objects,
                'image_path': event.image_path,
                'video_path': event.video_path
            })
        
        return export_data

