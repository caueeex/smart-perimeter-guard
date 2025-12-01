"""
Schemas de evento
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
from models.event import EventType


class EventBase(BaseModel):
    """Schema base de evento"""
    camera_id: Optional[int] = None  # Tornar opcional para permitir eventos sem câmera específica
    event_type: EventType
    description: Optional[str] = None
    confidence: Optional[float] = None


class EventCreate(EventBase):
    """Schema para criação de evento"""
    detected_objects: Optional[List[Dict[str, Any]]] = None
    bounding_boxes: Optional[List[Dict[str, Any]]] = None


class EventUpdate(BaseModel):
    """Schema para atualização de evento"""
    description: Optional[str] = None
    is_processed: Optional[bool] = None
    is_notified: Optional[bool] = None


class EventInDB(EventBase):
    """Schema de evento no banco"""
    id: int
    timestamp: datetime
    image_path: Optional[str] = None
    video_path: Optional[str] = None
    detected_objects: Optional[List[Dict[str, Any]]] = None
    bounding_boxes: Optional[List[Dict[str, Any]]] = None
    heatmap_data: Optional[Dict[str, Any]] = None
    is_processed: bool = False
    is_notified: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class Event(EventInDB):
    """Schema de evento para resposta"""
    pass


class EventWithCamera(Event):
    """Schema de evento com dados da câmera"""
    camera: "Camera"


class EventStats(BaseModel):
    """Schema para estatísticas de eventos"""
    total_events: int
    events_today: int
    events_this_week: int
    events_this_month: int
    intrusion_count: int
    movement_count: int
    alert_count: int
    most_active_camera: Optional[str] = None
    peak_hour: Optional[int] = None


class HeatmapData(BaseModel):
    """Schema para dados do heatmap"""
    camera_id: int
    date_range: str
    data: List[Dict[str, Any]]
    resolution: str = "32x32"

