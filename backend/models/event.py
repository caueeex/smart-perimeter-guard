"""
Modelo de evento
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, ForeignKey, Float, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import enum


class EventType(str, enum.Enum):
    """Tipos de evento"""
    INTRUSION = "intrusion"
    MOVEMENT = "movement"
    ALERT = "alert"


class Event(Base):
    """Modelo de evento"""
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=True)  # Permitir NULL para eventos sem câmera
    event_type = Column(String(50), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    description = Column(Text, nullable=True)
    confidence = Column(Float, nullable=True)  # Confiança da detecção (0-1)
    
    # Arquivos
    image_path = Column(String(500), nullable=True)
    video_path = Column(String(500), nullable=True)
    
    # Metadados da detecção
    detected_objects = Column(JSON, nullable=True)  # Lista de objetos detectados
    bounding_boxes = Column(JSON, nullable=True)  # Coordenadas dos objetos
    heatmap_data = Column(JSON, nullable=True)  # Dados do heatmap
    
    # Status
    is_processed = Column(Boolean, default=False, nullable=False)
    is_notified = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relacionamentos
    # camera = relationship("Camera", back_populates="events")  # Comentado para evitar erro de importação circular

    def __repr__(self):
        return f"<Event(id={self.id}, type='{self.event_type}', camera_id={self.camera_id})>"

