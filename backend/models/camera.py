"""
Modelo de câmera
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import enum


class CameraStatus(str, enum.Enum):
    """Status da câmera"""
    ONLINE = "online"
    OFFLINE = "offline"
    MAINTENANCE = "maintenance"


class Camera(Base):
    """Modelo de câmera"""
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    stream_url = Column(String(500), nullable=False)
    zone = Column(String(50), nullable=True)
    status = Column(String(50), default=CameraStatus.ONLINE, nullable=False)
    detection_enabled = Column(Boolean, default=True, nullable=False)
    detection_line = Column(JSON, nullable=True)  # Coordenadas da linha de detecção
    detection_zone = Column(JSON, nullable=True)  # Zona de detecção (polygon)
    sensitivity = Column(Integer, default=50, nullable=False)  # 0-100
    fps = Column(Integer, default=15, nullable=False)
    resolution = Column(String(20), default="640x480", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relacionamentos (comentado para evitar erro de importação circular)
    # events = relationship("Event", back_populates="camera")

    def __repr__(self):
        return f"<Camera(id={self.id}, name='{self.name}', status='{self.status}')>"

