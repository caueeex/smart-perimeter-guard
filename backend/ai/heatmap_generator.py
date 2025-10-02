"""
Gerador de heatmap para análise de movimento
"""
import numpy as np
import cv2
from typing import List, Dict, Any, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from models.event import Event
from models.camera import Camera
from config import settings


class HeatmapGenerator:
    """Gerador de heatmap de movimento"""

    def __init__(self, resolution: Tuple[int, int] = (32, 32)):
        self.resolution = resolution
        self.heatmap = np.zeros(resolution, dtype=np.float32)

    def generate_heatmap(self, events: List[Event], frame_width: int, frame_height: int) -> Dict[str, Any]:
        """Gerar heatmap a partir de eventos"""
        try:
            # Resetar heatmap
            self.heatmap = np.zeros(self.resolution, dtype=np.float32)
            
            if not events:
                return self._format_heatmap_data()

            # Processar cada evento
            for event in events:
                if event.bounding_boxes:
                    for bbox in event.bounding_boxes:
                        # Converter coordenadas para heatmap
                        heatmap_coords = self._convert_to_heatmap_coords(
                            bbox, frame_width, frame_height
                        )
                        
                        # Adicionar ao heatmap
                        self._add_to_heatmap(heatmap_coords, event.confidence or 1.0)

            # Normalizar heatmap
            self._normalize_heatmap()

            return self._format_heatmap_data()

        except Exception as e:
            print(f"Erro ao gerar heatmap: {e}")
            return self._format_heatmap_data()

    def _convert_to_heatmap_coords(self, bbox: List[int], frame_width: int, frame_height: int) -> Tuple[int, int]:
        """Converter coordenadas do frame para heatmap"""
        x1, y1, x2, y2 = bbox
        
        # Calcular centro do bounding box
        center_x = (x1 + x2) / 2
        center_y = (y1 + y2) / 2
        
        # Converter para coordenadas do heatmap
        heatmap_x = int((center_x / frame_width) * self.resolution[0])
        heatmap_y = int((center_y / frame_height) * self.resolution[1])
        
        # Garantir que está dentro dos limites
        heatmap_x = max(0, min(heatmap_x, self.resolution[0] - 1))
        heatmap_y = max(0, min(heatmap_y, self.resolution[1] - 1))
        
        return heatmap_x, heatmap_y

    def _add_to_heatmap(self, coords: Tuple[int, int], intensity: float):
        """Adicionar ponto ao heatmap"""
        x, y = coords
        
        # Adicionar intensidade no ponto
        self.heatmap[y, x] += intensity
        
        # Adicionar intensidade nos pontos vizinhos (blur)
        for dy in range(-1, 2):
            for dx in range(-1, 2):
                ny, nx = y + dy, x + dx
                if 0 <= ny < self.resolution[1] and 0 <= nx < self.resolution[0]:
                    distance = np.sqrt(dx*dx + dy*dy)
                    if distance > 0:
                        self.heatmap[ny, nx] += intensity * (1.0 / (1.0 + distance))

    def _normalize_heatmap(self):
        """Normalizar heatmap para valores entre 0 e 1"""
        if self.heatmap.max() > 0:
            self.heatmap = self.heatmap / self.heatmap.max()

    def _format_heatmap_data(self) -> Dict[str, Any]:
        """Formatar dados do heatmap para resposta"""
        return {
            "data": self.heatmap.tolist(),
            "resolution": f"{self.resolution[0]}x{self.resolution[1]}",
            "max_value": float(self.heatmap.max()),
            "min_value": float(self.heatmap.min()),
            "total_points": int(np.sum(self.heatmap > 0))
        }

    def generate_heatmap_image(self, colormap: int = cv2.COLORMAP_JET) -> np.ndarray:
        """Gerar imagem do heatmap"""
        try:
            # Normalizar para 0-255
            heatmap_normalized = (self.heatmap * 255).astype(np.uint8)
            
            # Aplicar colormap
            heatmap_colored = cv2.applyColorMap(heatmap_normalized, colormap)
            
            # Redimensionar para melhor visualização
            heatmap_resized = cv2.resize(heatmap_colored, (640, 480))
            
            return heatmap_resized

        except Exception as e:
            print(f"Erro ao gerar imagem do heatmap: {e}")
            return np.zeros((480, 640, 3), dtype=np.uint8)

    def get_heatmap_stats(self) -> Dict[str, Any]:
        """Obter estatísticas do heatmap"""
        return {
            "resolution": self.resolution,
            "total_points": int(np.sum(self.heatmap > 0)),
            "max_intensity": float(self.heatmap.max()),
            "min_intensity": float(self.heatmap.min()),
            "mean_intensity": float(np.mean(self.heatmap)),
            "std_intensity": float(np.std(self.heatmap))
        }

    def get_hotspots(self, threshold: float = 0.7) -> List[Dict[str, Any]]:
        """Obter pontos de maior intensidade (hotspots)"""
        hotspots = []
        
        # Encontrar pontos acima do threshold
        hot_points = np.where(self.heatmap >= threshold)
        
        for y, x in zip(hot_points[0], hot_points[1]):
            hotspots.append({
                "x": int(x),
                "y": int(y),
                "intensity": float(self.heatmap[y, x]),
                "percentage": float(self.heatmap[y, x] * 100)
            })
        
        # Ordenar por intensidade
        hotspots.sort(key=lambda h: h["intensity"], reverse=True)
        
        return hotspots

    def export_heatmap_data(self, format: str = "json") -> Dict[str, Any]:
        """Exportar dados do heatmap"""
        if format == "json":
            return {
                "heatmap": self.heatmap.tolist(),
                "stats": self.get_heatmap_stats(),
                "hotspots": self.get_hotspots(),
                "resolution": self.resolution,
                "timestamp": datetime.now().isoformat()
            }
        elif format == "csv":
            # Implementar exportação CSV
            pass
        else:
            raise ValueError(f"Formato não suportado: {format}")


def generate_camera_heatmap(
    db: Session, 
    camera_id: int, 
    start_date: datetime, 
    end_date: datetime,
    resolution: Tuple[int, int] = (32, 32)
) -> Dict[str, Any]:
    """Gerar heatmap para uma câmera específica"""
    try:
        # Obter eventos da câmera no período
        events = db.query(Event).filter(
            and_(
                Event.camera_id == camera_id,
                Event.timestamp >= start_date,
                Event.timestamp <= end_date,
                Event.bounding_boxes.isnot(None)
            )
        ).all()

        # Obter resolução da câmera
        camera = db.query(Camera).filter(Camera.id == camera_id).first()
        if not camera:
            return {"error": "Câmera não encontrada"}

        # Parsear resolução
        try:
            width, height = map(int, camera.resolution.split('x'))
        except:
            width, height = 640, 480

        # Gerar heatmap
        generator = HeatmapGenerator(resolution)
        heatmap_data = generator.generate_heatmap(events, width, height)
        
        # Adicionar metadados
        heatmap_data.update({
            "camera_id": camera_id,
            "camera_name": camera.name,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "total_events": len(events),
            "frame_resolution": f"{width}x{height}"
        })

        return heatmap_data

    except Exception as e:
        print(f"Erro ao gerar heatmap da câmera: {e}")
        return {"error": str(e)}

