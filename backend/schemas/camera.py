"""
Schemas de câmera
"""
from pydantic import BaseModel, HttpUrl
from typing import Optional, Dict, Any, List
from datetime import datetime
from models.camera import CameraStatus


class CameraBase(BaseModel):
    """Schema base de câmera"""
    name: str
    location: Optional[str] = None
    stream_url: str
    zone: Optional[str] = None
    detection_enabled: bool = True
    sensitivity: int = 50
    fps: int = 15
    resolution: str = "640x480"


class CameraCreate(CameraBase):
    """Schema para criação de câmera"""
    pass


class CameraUpdate(BaseModel):
    """Schema para atualização de câmera"""
    name: Optional[str] = None
    location: Optional[str] = None
    stream_url: Optional[str] = None
    zone: Optional[str] = None
    status: Optional[CameraStatus] = None
    detection_enabled: Optional[bool] = None
    detection_line: Optional[Dict[str, Any]] = None
    detection_zone: Optional[Dict[str, Any]] = None
    sensitivity: Optional[int] = None
    fps: Optional[int] = None
    resolution: Optional[str] = None


class CameraInDB(CameraBase):
    """Schema de câmera no banco"""
    id: int
    status: CameraStatus
    detection_line: Optional[str] = None  # JSON string
    detection_zone: Optional[str] = None  # JSON string
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @property
    def detection_line_dict(self) -> Optional[Dict[str, Any]]:
        """Converter detection_line para dict"""
        if self.detection_line:
            import json
            try:
                return json.loads(self.detection_line)
            except:
                return None
        return None

    @property
    def detection_zone_dict(self) -> Optional[Dict[str, Any]]:
        """Converter detection_zone para dict"""
        if self.detection_zone:
            import json
            try:
                return json.loads(self.detection_zone)
            except:
                return None
        return None


class Camera(CameraInDB):
    """Schema de câmera para resposta"""
    pass


class CameraWithEvents(Camera):
    """Schema de câmera com eventos"""
    # events: List["Event"] = []  # Comentado para evitar erro de importação circular


class DetectionLineConfig(BaseModel):
    """Schema para configuração de linha de detecção"""
    start_x: float
    start_y: float
    end_x: float
    end_y: float
    thickness: int = 2
    color: str = "#ff0000"


class DetectionZoneConfig(BaseModel):
    """Schema para configuração de zona de detecção"""
    points: List[Dict[str, float]]  # Lista de pontos {x, y}
    color: str = "#ff0000"
    fill_color: str = "#ff000020"

