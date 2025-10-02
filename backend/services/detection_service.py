"""
Serviço de detecção de invasão
"""
import asyncio
import cv2
import numpy as np
import threading
import time
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import os
from pathlib import Path

from ultralytics import YOLO
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from models.camera import Camera
from models.event import Event, EventType
from schemas.event import EventCreate
from config import settings
from database import SessionLocal


class DetectionService:
    """Serviço de detecção de invasão com IA"""

    def __init__(self):
        self.active_monitors: Dict[int, bool] = {}
        self.camera_threads: Dict[int, threading.Thread] = {}
        self.model = None
        self.load_model()

    def load_model(self):
        """Carregar modelo YOLO"""
        try:
            # Carregar modelo YOLO diretamente
            from ultralytics import YOLO
            import torch
            
            # Monkey patch para desabilitar weights_only
            original_load = torch.load
            def patched_load(*args, **kwargs):
                kwargs['weights_only'] = False
                return original_load(*args, **kwargs)
            
            torch.load = patched_load
            self.model = YOLO('yolov8n.pt')
            torch.load = original_load  # Restaurar função original
            
            print("Modelo YOLO carregado com sucesso")
        except Exception as e:
            print(f"Erro ao carregar modelo: {e}")
            self.model = None

    def start_monitoring(self, camera_id: int, stream_url: str):
        """Iniciar monitoramento de câmera"""
        if camera_id in self.active_monitors:
            self.stop_monitoring(camera_id)

        self.active_monitors[camera_id] = True
        thread = threading.Thread(
            target=self._monitor_camera,
            args=(camera_id, stream_url),
            daemon=True
        )
        self.camera_threads[camera_id] = thread
        thread.start()
        print(f"Monitoramento iniciado para câmera {camera_id}")

    def stop_monitoring(self, camera_id: int):
        """Parar monitoramento de câmera"""
        if camera_id in self.active_monitors:
            self.active_monitors[camera_id] = False
            if camera_id in self.camera_threads:
                self.camera_threads[camera_id].join(timeout=5)
                del self.camera_threads[camera_id]
            print(f"Monitoramento parado para câmera {camera_id}")

    def _monitor_camera(self, camera_id: int, stream_url: str):
        """Monitorar câmera em thread separada"""
        cap = None
        try:
            # Conectar à câmera
            cap = cv2.VideoCapture(stream_url)
            if not cap.isOpened():
                print(f"Erro ao conectar à câmera {camera_id}")
                return

            # Obter configurações da câmera
            db = SessionLocal()
            camera = db.query(Camera).filter(Camera.id == camera_id).first()
            if not camera:
                print(f"Câmera {camera_id} não encontrada")
                return

            detection_line = camera.detection_line
            detection_zone = camera.detection_zone
            sensitivity = camera.sensitivity

            frame_count = 0
            last_detection_time = 0
            min_detection_interval = 5  # Mínimo 5 segundos entre detecções

            while self.active_monitors.get(camera_id, False):
                ret, frame = cap.read()
                if not ret:
                    print(f"Erro ao ler frame da câmera {camera_id}")
                    time.sleep(1)
                    continue

                frame_count += 1
                
                # Processar frame a cada 5 frames (reduzir carga)
                if frame_count % 5 == 0:
                    current_time = time.time()
                    
                    # Verificar intervalo mínimo entre detecções
                    if current_time - last_detection_time < min_detection_interval:
                        continue

                    # Detectar objetos
                    detection_result = self._detect_objects(frame, camera_id)
                    
                    if detection_result:
                        # Verificar se cruzou linha/zona
                        intrusion_detected = self._check_intrusion(
                            frame, detection_result, detection_line, detection_zone
                        )
                        
                        if intrusion_detected:
                            last_detection_time = current_time
                            self._handle_intrusion(
                                db, camera_id, frame, detection_result, current_time
                            )

                # Controle de FPS
                time.sleep(1.0 / camera.fps)

        except Exception as e:
            print(f"Erro no monitoramento da câmera {camera_id}: {e}")
        finally:
            if cap:
                cap.release()
            db.close()

    def _detect_objects(self, frame: np.ndarray, camera_id: int) -> Optional[List[Dict]]:
        """Detectar objetos no frame"""
        if not self.model:
            return None

        try:
            results = self.model(frame, conf=settings.confidence_threshold)
            detections = []

            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        # Obter coordenadas
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        confidence = box.conf[0].cpu().numpy()
                        class_id = int(box.cls[0].cpu().numpy())
                        class_name = self.model.names[class_id]

                        # Filtrar apenas pessoas, carros, etc.
                        if class_name in ['person', 'car', 'truck', 'bus', 'motorcycle', 'bicycle']:
                            detections.append({
                                'bbox': [int(x1), int(y1), int(x2), int(y2)],
                                'confidence': float(confidence),
                                'class': class_name,
                                'center': [int((x1 + x2) / 2), int((y1 + y2) / 2)]
                            })

            return detections if detections else None

        except Exception as e:
            print(f"Erro na detecção de objetos: {e}")
            return None

    def _check_intrusion(self, frame: np.ndarray, detections: List[Dict], 
                        detection_line: Optional[Dict], detection_zone: Optional[Dict]) -> bool:
        """Verificar se houve invasão"""
        if not detections:
            return False

        # Verificar cruzamento de linha
        if detection_line:
            for detection in detections:
                center = detection['center']
                if self._point_crossed_line(center, detection_line):
                    return True

        # Verificar entrada em zona
        if detection_zone:
            for detection in detections:
                center = detection['center']
                if self._point_in_zone(center, detection_zone):
                    return True

        return False

    def _point_crossed_line(self, point: List[int], line: Dict) -> bool:
        """Verificar se ponto cruzou a linha"""
        try:
            px, py = point
            x1, y1 = line['start_x'], line['start_y']
            x2, y2 = line['end_x'], line['end_y']

            # Verificar se ponto está próximo da linha
            distance = self._point_to_line_distance(px, py, x1, y1, x2, y2)
            return distance < 20  # 20 pixels de tolerância

        except Exception as e:
            print(f"Erro ao verificar cruzamento de linha: {e}")
            return False

    def _point_in_zone(self, point: List[int], zone: Dict) -> bool:
        """Verificar se ponto está na zona"""
        try:
            px, py = point
            points = zone.get('points', [])
            
            if len(points) < 3:
                return False

            # Algoritmo ray casting para verificar se ponto está dentro do polígono
            n = len(points)
            inside = False

            for i in range(n):
                j = (i + 1) % n
                if ((points[i]['y'] > py) != (points[j]['y'] > py)) and \
                   (px < (points[j]['x'] - points[i]['x']) * (py - points[i]['y']) / 
                    (points[j]['y'] - points[i]['y']) + points[i]['x']):
                    inside = not inside

            return inside

        except Exception as e:
            print(f"Erro ao verificar zona: {e}")
            return False

    def _point_to_line_distance(self, px: int, py: int, x1: float, y1: float, x2: float, y2: float) -> float:
        """Calcular distância de ponto à linha"""
        A = px - x1
        B = py - y1
        C = x2 - x1
        D = y2 - y1

        dot = A * C + B * D
        len_sq = C * C + D * D
        
        if len_sq == 0:
            return np.sqrt(A * A + B * B)
        
        param = dot / len_sq

        if param < 0:
            xx, yy = x1, y1
        elif param > 1:
            xx, yy = x2, y2
        else:
            xx = x1 + param * C
            yy = y1 + param * D

        dx = px - xx
        dy = py - yy
        return np.sqrt(dx * dx + dy * dy)

    def _handle_intrusion(self, db: Session, camera_id: int, frame: np.ndarray, 
                         detections: List[Dict], timestamp: float):
        """Processar invasão detectada"""
        try:
            # Salvar screenshot
            image_path = self._save_screenshot(frame, camera_id, timestamp)
            
            # Salvar vídeo (5-10 segundos)
            video_path = self._save_video_clip(camera_id, timestamp)

            # Criar evento no banco
            event = Event(
                camera_id=camera_id,
                event_type=EventType.INTRUSION,
                description=f"Invasão detectada - {len(detections)} objeto(s)",
                confidence=max([d['confidence'] for d in detections]),
                image_path=image_path,
                video_path=video_path,
                detected_objects=detections,
                bounding_boxes=[d['bbox'] for d in detections],
                is_processed=True,
                is_notified=False
            )

            db.add(event)
            db.commit()

            # Enviar notificação WebSocket
            self._send_notification(camera_id, event.id, detections)

            print(f"Invasão detectada na câmera {camera_id}")

        except Exception as e:
            print(f"Erro ao processar invasão: {e}")

    def _save_screenshot(self, frame: np.ndarray, camera_id: int, timestamp: float) -> str:
        """Salvar screenshot"""
        try:
            timestamp_str = datetime.fromtimestamp(timestamp).strftime("%Y%m%d_%H%M%S")
            filename = f"camera_{camera_id}_{timestamp_str}.jpg"
            filepath = os.path.join(settings.upload_dir, "screenshots", filename)
            
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            cv2.imwrite(filepath, frame)
            
            return filepath

        except Exception as e:
            print(f"Erro ao salvar screenshot: {e}")
            return ""

    def _save_video_clip(self, camera_id: int, timestamp: float) -> str:
        """Salvar clipe de vídeo"""
        try:
            timestamp_str = datetime.fromtimestamp(timestamp).strftime("%Y%m%d_%H%M%S")
            filename = f"camera_{camera_id}_{timestamp_str}.mp4"
            filepath = os.path.join(settings.upload_dir, "videos", filename)
            
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            
            # Implementar gravação de vídeo
            # Por enquanto, retornar caminho vazio
            return ""

        except Exception as e:
            print(f"Erro ao salvar vídeo: {e}")
            return ""

    def _send_notification(self, camera_id: int, event_id: int, detections: List[Dict]):
        """Enviar notificação via WebSocket"""
        try:
            # Implementar notificação WebSocket
            # Por enquanto, apenas log
            print(f"Notificação enviada: Câmera {camera_id}, Evento {event_id}")

        except Exception as e:
            print(f"Erro ao enviar notificação: {e}")

    def get_heatmap_data(self, camera_id: int, date_range: str) -> Dict:
        """Gerar dados do heatmap"""
        try:
            # Implementar geração de heatmap
            # Por enquanto, retornar dados mock
            return {
                "camera_id": camera_id,
                "date_range": date_range,
                "data": [],
                "resolution": "32x32"
            }

        except Exception as e:
            print(f"Erro ao gerar heatmap: {e}")
            return {}


# Instância global do serviço
detection_service = DetectionService()

