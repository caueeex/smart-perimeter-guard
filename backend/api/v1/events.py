"""
Endpoints de eventos
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from database import get_db
from schemas.event import Event, EventCreate, EventUpdate, EventStats, HeatmapData
from schemas.user import User
from services.event_service import EventService
from services.auth_service import AuthService
from models.event import EventType

router = APIRouter()


@router.post("/", response_model=Event, status_code=status.HTTP_201_CREATED)
def create_event(
    event: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Criar novo evento"""
    return EventService.create_event(db, event)


@router.get("/", response_model=List[Event])
def get_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    camera_id: Optional[int] = Query(None),
    event_type: Optional[EventType] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Obter lista de eventos com filtros"""
    return EventService.get_events(
        db, skip=skip, limit=limit, camera_id=camera_id,
        event_type=event_type, start_date=start_date, end_date=end_date
    )


@router.get("/{event_id}", response_model=Event)
def get_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Obter evento por ID"""
    event = EventService.get_event(db, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento não encontrado"
        )
    return event


@router.put("/{event_id}", response_model=Event)
def update_event(
    event_id: int,
    event_update: EventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Atualizar evento"""
    event = EventService.update_event(db, event_id, event_update)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento não encontrado"
        )
    return event


@router.delete("/{event_id}")
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_admin_user)
):
    """Deletar evento"""
    success = EventService.delete_event(db, event_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento não encontrado"
        )
    return {"message": "Evento deletado com sucesso"}


@router.get("/stats/summary", response_model=EventStats)
def get_event_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Obter estatísticas de eventos"""
    return EventService.get_event_stats(db)


@router.get("/camera/{camera_id}", response_model=List[Event])
def get_events_by_camera(
    camera_id: int,
    limit: int = Query(50, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Obter eventos por câmera"""
    return EventService.get_events_by_camera(db, camera_id, limit)


@router.get("/recent/list", response_model=List[Event])
def get_recent_events(
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Obter eventos recentes"""
    return EventService.get_recent_events(db, limit)


@router.post("/{event_id}/mark-notified")
def mark_event_as_notified(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Marcar evento como notificado"""
    success = EventService.mark_event_as_notified(db, event_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento não encontrado"
        )
    return {"message": "Evento marcado como notificado"}


@router.get("/export/data")
def export_events(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    camera_id: Optional[int] = Query(None),
    event_type: Optional[EventType] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Exportar eventos para relatório"""
    return EventService.export_events(
        db, start_date=start_date, end_date=end_date,
        camera_id=camera_id, event_type=event_type
    )


@router.get("/heatmap/{camera_id}", response_model=HeatmapData)
def get_heatmap_data(
    camera_id: int,
    date_range: str = Query("7d", description="Período: 1d, 7d, 30d"),
    db: Session = Depends(get_db),
    current_user: User = Depends(AuthService.get_current_active_user)
):
    """Obter dados do heatmap"""
    from services.detection_service import detection_service
    return detection_service.get_heatmap_data(camera_id, date_range)

