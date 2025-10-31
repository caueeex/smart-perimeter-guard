"""
Serviço de detecção de invasão avançado
"""
import asyncio
import cv2
import numpy as np
import threading
import time
import json
import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import os
from pathlib import Path
from collections import deque

from ultralytics import YOLO
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from models.camera import Camera
from models.event import Event, EventType
from schemas.event import EventCreate
from config import settings
from database import SessionLocal
from websocket_manager import manager

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DetectionService:
    """Serviço de detecção de invasão com IA"""

    def __init__(self):
        self.active_monitors: Dict[int, bool] = {}
        self.camera_threads: Dict[int, threading.Thread] = {}
        self.model = None
        
        # Sistema de rastreamento avançado
        self.tracking_data: Dict[int, Dict] = {}
        self.motion_history: Dict[int, deque] = {}
        self.last_detection_time: Dict[int, float] = {}
        self.detection_cooldown = 3.0  # Cooldown reduzido para 3 segundos
        
        # Configurações avançadas
        self.min_confidence = 0.5
        self.min_area = 1000  # Área mínima para considerar movimento significativo
        self.tracking_threshold = 50  # Distância máxima para considerar mesmo objeto
        
        # Background subtractors para cada câmera
        self.bg_subtractors: Dict[int, cv2.BackgroundSubtractor] = {}
        
        self.load_model()

    def load_model(self):
        """Carregar modelo YOLO"""
        try:
            # Tentar carregar o modelo preferido; se falhar, usar o yolov8n padrão
            from ultralytics import YOLO
            model_path = settings.model_path if os.path.exists(settings.model_path) else 'yolov8n.pt'
            logger.info(f"Carregando modelo YOLO de: {model_path}")
            try:
                self.model = YOLO(model_path)
            except Exception as inner_e:
                logger.warning(f"Falha ao carregar {model_path} ({inner_e}), tentando yolov8n.pt padrão")
                self.model = YOLO('yolov8n.pt')
            logger.info("✅ Modelo YOLO carregado com sucesso")
        except Exception as e:
            logger.error(f"❌ Erro ao carregar modelo YOLO: {e}")
            self.model = None
    
    def _parse_config(self, config) -> Optional[Dict]:
        """Helper para parse seguro de configuração (aceita dict ou string JSON)"""
        if config is None:
            return None
        try:
            if isinstance(config, dict):
                return config
            elif isinstance(config, str):
                return json.loads(config)
            else:
                logger.warning(f"Tipo de configuração não suportado: {type(config)}")
                return None
        except json.JSONDecodeError as e:
            logger.error(f"Erro ao fazer parse de configuração JSON: {e}")
            return None
        except Exception as e:
            logger.error(f"Erro ao processar configuração: {e}")
            return None
    
    def is_model_loaded(self) -> bool:
        """Verificar se o modelo YOLO está carregado"""
        return self.model is not None

    def start_monitoring(self, camera_id: int, stream_url: str):
        """Iniciar monitoramento de câmera"""
        if camera_id in self.active_monitors:
            self.stop_monitoring(camera_id)

        self.active_monitors[camera_id] = True
        
        # Inicializar sistemas de rastreamento
        self.tracking_data[camera_id] = {
            'objects': {},
            'next_id': 0,
            'frame_count': 0
        }
        self.motion_history[camera_id] = deque(maxlen=30)  # Histórico de 30 frames
        self.last_detection_time[camera_id] = 0
        
        # Inicializar background subtractor
        self.bg_subtractors[camera_id] = cv2.createBackgroundSubtractorMOG2(
            detectShadows=True,
            varThreshold=50,
            history=500
        )
        
        thread = threading.Thread(
            target=self._monitor_camera,
            args=(camera_id, stream_url),
            daemon=True
        )
        self.camera_threads[camera_id] = thread
        thread.start()
        logger.info(f"Monitoramento avançado iniciado para câmera {camera_id}")

    def stop_monitoring(self, camera_id: int):
        """Parar monitoramento de câmera"""
        if camera_id in self.active_monitors:
            self.active_monitors[camera_id] = False
            if camera_id in self.camera_threads:
                self.camera_threads[camera_id].join(timeout=5)
                del self.camera_threads[camera_id]
            
            # Limpar dados de rastreamento
            if camera_id in self.tracking_data:
                del self.tracking_data[camera_id]
            if camera_id in self.motion_history:
                del self.motion_history[camera_id]
            if camera_id in self.bg_subtractors:
                del self.bg_subtractors[camera_id]
            if camera_id in self.last_detection_time:
                del self.last_detection_time[camera_id]
                
            logger.info(f"Monitoramento parado para câmera {camera_id}")

    def _monitor_camera(self, camera_id: int, stream_url: str):
        """Monitorar câmera em thread separada com detecção avançada"""
        cap = None
        db = None
        try:
            # Conectar à câmera (Windows: tentar DirectShow antes de MSMF)
            if stream_url.startswith("webcam://"):
                token = stream_url.split("://")[1]
                camera_index = int(token) if token.isdigit() else 0
                cap = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)
                if not cap.isOpened():
                    cap.release()
                    cap = cv2.VideoCapture(camera_index, cv2.CAP_MSMF)
            else:
                cap = cv2.VideoCapture(stream_url)
                
            if not cap.isOpened():
                logger.error(f"Erro ao conectar à câmera {camera_id} - URL: {stream_url}")
                return

            # Configurar propriedades da câmera
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            cap.set(cv2.CAP_PROP_FPS, 15)
            
            logger.info(f"✅ Conectado à câmera {camera_id} - URL: {stream_url}")
            
            # Validar modelo YOLO
            if not self.is_model_loaded():
                logger.error(f"❌ Modelo YOLO não está carregado! Detecção não funcionará para câmera {camera_id}")
                return
            
            # Obter configurações da câmera
            db = SessionLocal()
            camera = db.query(Camera).filter(Camera.id == camera_id).first()
            if not camera:
                logger.error(f"❌ Câmera {camera_id} não encontrada no banco de dados")
                db.close()
                return
            
            if not camera.detection_enabled:
                logger.info(f"⚠️ Detecção desabilitada para câmera {camera_id}")
                db.close()
                return

            # Configurações de detecção
            # Sensibilidade em faixa segura
            sensitivity = max(0.25, min(0.7, (camera.sensitivity or 50) / 100.0))
            detection_line = camera.detection_line
            detection_zone = camera.detection_zone
            
            logger.info(f"📹 Configurações da câmera {camera_id}: sensitivity={sensitivity:.2f}, "
                       f"tem_linha={detection_line is not None}, tem_zona={detection_zone is not None}")
            
            frame_count = 0
            bg_subtractor = self.bg_subtractors[camera_id]
            tracking_data = self.tracking_data[camera_id]
            
            # Kernel para operações morfológicas
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
            
            fail_reads = 0
            while self.active_monitors.get(camera_id, False):
                ret, frame = cap.read()
                if not ret or frame is None:
                    fail_reads += 1
                    logger.warning(f"Erro ao ler frame da câmera {camera_id}")
                    if fail_reads >= 50:
                        logger.error(f"Encerrando monitor da câmera {camera_id} por falha contínua de leitura")
                        break
                    time.sleep(0.1)
                    continue
                else:
                    fail_reads = 0

                frame_count += 1
                current_time = time.time()
                
                # Processar frame a cada 3 frames para melhor performance
                if frame_count % 3 == 0:
                    # Verificar cooldown
                    time_since_last = current_time - self.last_detection_time.get(camera_id, 0)
                    if time_since_last < self.detection_cooldown:
                        continue
                    
                    # Detecção avançada
                    intrusion_detected = self._advanced_detection(
                        frame, camera_id, sensitivity, detection_line, detection_zone, bg_subtractor, kernel
                    )
                    
                    if intrusion_detected:
                        logger.warning(f"🚨 INTRUSÃO DETECTADA na câmera {camera_id}!")
                        self.last_detection_time[camera_id] = current_time
                        self._handle_intrusion_advanced(
                            db, camera_id, frame, current_time
                        )
                    elif frame_count % 30 == 0:  # Log a cada ~2 segundos quando processando
                        logger.debug(f"📊 Câmera {camera_id}: Processando frame {frame_count}, sem intrusão detectada")

                # Controle de FPS
                time.sleep(1.0 / 15)  # 15 FPS

        except Exception as e:
            logger.error(f"Erro no monitoramento da câmera {camera_id}: {e}")
        finally:
            if cap:
                cap.release()
            if db:
                db.close()

    def _advanced_detection(self, frame: np.ndarray, camera_id: int, sensitivity: float, 
                           detection_line: Optional[str], detection_zone: Optional[str], 
                           bg_subtractor, kernel) -> bool:
        """Detecção avançada combinando YOLO e análise de movimento"""
        try:
            # 1. Detecção de movimento com background subtraction
            motion_detected = self._detect_motion(frame, bg_subtractor, kernel)
            if motion_detected:
                logger.debug(f"📌 Movimento detectado na câmera {camera_id}")
            
            # 2. Detecção de objetos com YOLO (se disponível)
            objects = self._detect_objects_yolo(frame, sensitivity) if self.model else []
            if objects:
                logger.debug(f"🎯 YOLO detectou {len(objects)} objeto(s) na câmera {camera_id}: {[obj['class'] for obj in objects]}")
            
            # 3. Rastreamento de objetos
            tracked_objects = self._track_objects(frame, camera_id, objects)
            if tracked_objects:
                logger.debug(f"📡 {len(tracked_objects)} objeto(s) sendo rastreado(s) na câmera {camera_id}")
            
            # 4. Verificar intrusão nas áreas configuradas ou modo básico
            if tracked_objects:
                return self._check_advanced_intrusion(
                    frame, tracked_objects, detection_line, detection_zone
                )
            # Se não há objetos rastreados mas houve movimento e existe zona configurada, considerar intrusão
            if motion_detected and detection_zone:
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Erro na detecção avançada (câmera {camera_id}): {e}", exc_info=True)
            return False

    def _detect_motion(self, frame: np.ndarray, bg_subtractor, kernel) -> bool:
        """Detectar movimento usando background subtraction"""
        try:
            # Aplicar background subtraction
            fg_mask = bg_subtractor.apply(frame)
            
            # Operações morfológicas para limpar ruído
            fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel)
            fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel)
            
            # Encontrar contornos
            contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Verificar se há movimento significativo
            h, w = frame.shape[:2]
            dynamic_min_area = max(800, int((w * h) * 0.0006))
            for contour in contours:
                area = cv2.contourArea(contour)
                if area > max(self.min_area, dynamic_min_area):
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Erro na detecção de movimento: {e}")
            return False

    def _detect_objects_yolo(self, frame: np.ndarray, sensitivity: float) -> List[Dict]:
        """Detectar objetos usando YOLO"""
        objects = []
        
        try:
            if not self.model:
                logger.warning("⚠️ Modelo YOLO não disponível - detecção não funcionará")
                return objects
            
            # Executar detecção YOLO
            results = self.model(frame, conf=sensitivity, verbose=False)
            
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        # Obter coordenadas e confiança
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        confidence = box.conf[0].cpu().numpy()
                        class_id = int(box.cls[0].cpu().numpy())
                        class_name = self.model.names[class_id]
                        
                        # Filtrar apenas objetos relevantes
                        if class_name in ['person', 'car', 'truck', 'bus', 'motorcycle', 'bicycle']:
                            objects.append({
                                'bbox': [int(x1), int(y1), int(x2), int(y2)],
                                'confidence': float(confidence),
                                'class': class_name,
                                'center': [int((x1 + x2) / 2), int((y1 + y2) / 2)],
                                'area': int((x2 - x1) * (y2 - y1))
                            })
            
        except Exception as e:
            logger.error(f"❌ Erro na detecção YOLO: {e}", exc_info=True)
        
        return objects

    def _track_objects(self, frame: np.ndarray, camera_id: int, objects: List[Dict]) -> List[Dict]:
        """Rastrear objetos entre frames"""
        tracked = []
        tracking_data = self.tracking_data[camera_id]
        
        try:
            current_objects = {}
            
            for obj in objects:
                center = obj['center']
                best_match_id = None
                best_distance = float('inf')
                
                # Encontrar objeto mais próximo em frames anteriores
                for obj_id, tracked_obj in tracking_data['objects'].items():
                    if tracked_obj['active']:
                        distance = np.sqrt(
                            (center[0] - tracked_obj['center'][0])**2 + 
                            (center[1] - tracked_obj['center'][1])**2
                        )
                        
                        if distance < best_distance and distance < self.tracking_threshold:
                            best_distance = distance
                            best_match_id = obj_id
                
                # Atualizar ou criar objeto rastreado
                if best_match_id is not None:
                    # Atualizar objeto existente
                    tracking_data['objects'][best_match_id].update({
                        'center': center,
                        'bbox': obj['bbox'],
                        'confidence': obj['confidence'],
                        'class': obj['class'],
                        'last_seen': time.time(),
                        'active': True
                    })
                    current_objects[best_match_id] = tracking_data['objects'][best_match_id]
                else:
                    # Criar novo objeto
                    new_id = tracking_data['next_id']
                    tracking_data['next_id'] += 1
                    
                    tracking_data['objects'][new_id] = {
                        'id': new_id,
                        'center': center,
                        'bbox': obj['bbox'],
                        'confidence': obj['confidence'],
                        'class': obj['class'],
                        'first_seen': time.time(),
                        'last_seen': time.time(),
                        'active': True,
                        'frames_count': 1
                    }
                    current_objects[new_id] = tracking_data['objects'][new_id]
            
            # Marcar objetos inativos
            current_time = time.time()
            for obj_id, tracked_obj in tracking_data['objects'].items():
                if obj_id not in current_objects:
                    if current_time - tracked_obj['last_seen'] > 2.0:  # 2 segundos sem ser visto
                        tracked_obj['active'] = False
                    else:
                        current_objects[obj_id] = tracked_obj
            
            # Filtrar apenas objetos ativos e com histórico suficiente
            for obj_id, tracked_obj in current_objects.items():
                if tracked_obj['active'] and tracked_obj.get('frames_count', 0) >= 2:
                    tracked.append(tracked_obj)
            
            # Atualizar contagem de frames
            for obj in tracked:
                obj['frames_count'] = obj.get('frames_count', 0) + 1
            
        except Exception as e:
            logger.error(f"Erro no rastreamento: {e}")
        
        return tracked

    def _check_advanced_intrusion(self, frame: np.ndarray, objects: List[Dict], 
                                 detection_line: Optional[str], detection_zone: Optional[str]) -> bool:
        """Verificar intrusão avançada"""
        try:
            if not objects:
                return False
            
            # Parse seguro das configurações
            line_config = self._parse_config(detection_line)
            zone_config = self._parse_config(detection_zone)
            
            # Verificar cruzamento de linha
            if line_config:
                for obj in objects:
                    if self._check_line_crossing(obj['center'], line_config):
                        logger.warning(f"🚨 Intrusão detectada: cruzamento de linha por {obj['class']} "
                                     f"(confiança: {obj['confidence']:.2f})")
                        return True
            
            # Verificar entrada em zona
            if zone_config:
                for obj in objects:
                    if self._check_zone_intrusion(obj['center'], zone_config, frame.shape):
                        logger.warning(f"🚨 Intrusão detectada: entrada em zona por {obj['class']} "
                                     f"(confiança: {obj['confidence']:.2f})")
                        return True
            
            # MODO BÁSICO: Se não há linha nem zona configurada, detectar qualquer pessoa/carro na cena
            if not line_config and not zone_config:
                # Filtrar apenas objetos com alta confiança e área significativa
                for obj in objects:
                    if obj['confidence'] >= 0.6 and obj['area'] > 2000:  # Área mínima de 2000 pixels
                        logger.warning(f"🚨 Intrusão detectada (modo básico): {obj['class']} detectado "
                                     f"(confiança: {obj['confidence']:.2f}, área: {obj['area']} pixels)")
                        return True
                # Log quando detecta objetos mas não atende critérios
                if objects:
                    logger.debug(f"📋 Objetos detectados mas não atendem critérios de intrusão "
                               f"(precisa conf>=0.6 e área>2000px): {[(o['class'], o['confidence'], o['area']) for o in objects]}")
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Erro na verificação de intrusão: {e}", exc_info=True)
            return False

    def _check_line_crossing(self, point: List[int], line_config: Dict) -> bool:
        """Verificar se ponto cruzou a linha"""
        try:
            px, py = point
            x1 = line_config.get('start_x') or line_config.get('x1', 0)
            y1 = line_config.get('start_y') or line_config.get('y1', 0)
            x2 = line_config.get('end_x') or line_config.get('x2', 0)
            y2 = line_config.get('end_y') or line_config.get('y2', 0)
            
            if x1 == 0 and y1 == 0 and x2 == 0 and y2 == 0:
                logger.warning("⚠️ Configuração de linha inválida (todos pontos são 0)")
                return False
            
            # Calcular distância do ponto à linha
            distance = self._point_to_line_distance(px, py, x1, y1, x2, y2)
            
            # Threshold aumentado para 50 pixels (menos restritivo)
            threshold = 50
            is_crossing = distance < threshold
            
            if is_crossing:
                logger.debug(f"📏 Objeto próximo da linha: distância={distance:.1f}px < threshold={threshold}px")
            
            return is_crossing
            
        except Exception as e:
            logger.error(f"❌ Erro na verificação de linha: {e}", exc_info=True)
            return False

    def _check_zone_intrusion(self, point: List[int], zone_config: Dict, frame_shape: Optional[Tuple[int,int,int]] = None) -> bool:
        """Verificar se ponto está na zona"""
        try:
            px, py = point
            points = zone_config.get('points', [])
            # Ajustar escala se config tiver referência de largura/altura
            ref_w = zone_config.get('ref_w')
            ref_h = zone_config.get('ref_h')
            if frame_shape is not None and ref_w and ref_h and ref_w > 0 and ref_h > 0:
                h, w = frame_shape[0], frame_shape[1]
                sx = w / float(ref_w)
                sy = h / float(ref_h)
                points = [{ 'x': p['x'] * sx, 'y': p['y'] * sy } for p in points]
            
            if len(points) < 3:
                return False
            
            # Converter pontos para formato numpy
            polygon_points = np.array([[p['x'], p['y']] for p in points], np.int32)
            
            # Verificar se ponto está dentro do polígono
            inside = cv2.pointPolygonTest(polygon_points, (px, py), False)
            
            return inside >= 0  # Dentro ou na borda
            
        except Exception as e:
            logger.error(f"Erro na verificação de zona: {e}")
            return False

    def _point_to_line_distance(self, px: int, py: int, x1: float, y1: float, x2: float, y2: float) -> float:
        """Calcular distância de ponto à linha"""
        try:
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
            
        except Exception as e:
            logger.error(f"Erro no cálculo de distância: {e}")
            return float('inf')

    def _handle_intrusion_advanced(self, db: Session, camera_id: int, frame: np.ndarray, timestamp: float):
        """Processar evento de intrusão avançado"""
        try:
            # Garantir que diretório existe
            screenshot_dir = os.path.join(settings.upload_dir, "screenshots")
            os.makedirs(screenshot_dir, exist_ok=True)
            
            # Salvar screenshot
            timestamp_str = datetime.fromtimestamp(timestamp).strftime('%Y%m%d_%H%M%S_%f')[:-3]
            filename = f"intrusion_{camera_id}_{timestamp_str}.jpg"
            filepath = os.path.join(screenshot_dir, filename)
            # URL pública para o frontend (sempre com barras)
            public_url = f"/uploads/screenshots/{filename}"
            
            success = cv2.imwrite(filepath, frame)
            if not success:
                logger.error(f"❌ Falha ao salvar screenshot: {filepath}")
                filepath = None
                public_url = None
            
            # Criar evento com EventType correto
            event = Event(
                camera_id=camera_id,
                event_type=EventType.INTRUSION.value,  # Usar EventType.INTRUSION ao invés de string
                confidence=0.9,  # Alta confiança para detecção avançada
                description="Intrusão detectada - Sistema avançado de detecção",
                image_path=public_url or filepath,
                timestamp=datetime.fromtimestamp(timestamp),
                is_processed=True,
                is_notified=False
            )
            
            db.add(event)
            db.commit()
            db.refresh(event)
            
            logger.warning(f"✅ Evento de intrusão registrado: ID={event.id}, Câmera={camera_id}, "
                          f"Timestamp={timestamp_str}, Imagem={'OK' if filepath else 'FALHOU'}")
            
            # Tentar enviar notificação WebSocket
            try:
                payload = {
                    'type': 'event_created',
                    'event': {
                        'id': event.id,
                        'camera_id': camera_id,
                        'event_type': event.event_type,
                        'confidence': event.confidence,
                        'timestamp': event.timestamp.isoformat(),
                        'description': event.description,
                        'image_path': event.image_path,
                    }
                }
                awaitable = manager.broadcast(payload)
                try:
                    loop = asyncio.get_event_loop()
                    loop.create_task(awaitable)
                except RuntimeError:
                    asyncio.run(awaitable)
            except Exception as notif_error:
                logger.warning(f"⚠️ Falha ao enviar notificação WebSocket: {notif_error}")
            
        except Exception as e:
            logger.error(f"❌ Erro ao processar intrusão (câmera {camera_id}): {e}", exc_info=True)
            db.rollback()

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

    def _check_intrusion(self, frame: np.ndarray, boxes, 
                        detection_line: Optional[Dict], detection_zone: Optional[Dict]) -> bool:
        """Verificar se houve invasão"""
        if boxes is None or len(boxes) == 0:
            return False

        # Verificar cruzamento de linha
        if detection_line:
            for box in boxes:
                # Obter centro do objeto
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                center_x = int((x1 + x2) / 2)
                center_y = int((y1 + y2) / 2)
                
                if self._point_crossed_line([center_x, center_y], detection_line):
                    return True

        # Verificar entrada em zona
        if detection_zone:
            for box in boxes:
                # Obter centro do objeto
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                center_x = int((x1 + x2) / 2)
                center_y = int((y1 + y2) / 2)
                
                if self._point_in_zone([center_x, center_y], detection_zone):
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

