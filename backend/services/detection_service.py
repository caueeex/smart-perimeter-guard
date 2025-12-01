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
from collections import deque

from ultralytics import YOLO
from sqlalchemy.orm import Session

from models.camera import Camera
from models.event import Event, EventType
from config import settings
from database import SessionLocal
from websocket_manager import manager

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
        
        # Cooldown específico para emails (evitar spam)
        self.last_email_time: Dict[int, float] = {}
        self.email_cooldown = 30.0  # Enviar apenas 1 email a cada 60 segundos por câmera
        
        # Configurações avançadas
        self.min_confidence = 0.5
        self.min_area = 1000  # Área mínima para considerar movimento significativo
        self.tracking_threshold = 50  # Distância máxima para considerar mesmo objeto
        
        # Background subtractors para cada câmera
        self.bg_subtractors: Dict[int, cv2.BackgroundSubtractor] = {}
        
        # Armazenar email do usuário logado por câmera
        self.camera_user_emails: Dict[int, str] = {}
        
        self.load_model()

    def load_model(self):
        """Carregar modelo YOLO com suporte para PyTorch 2.6+"""
        try:
            import torch
            from ultralytics import YOLO
            
            # Configurar PyTorch para permitir carregar modelos YOLO (PyTorch 2.6+)
            # Adicionar globals seguros para ultralytics
            try:
                from ultralytics.nn.tasks import DetectionModel
                torch.serialization.add_safe_globals([DetectionModel])
                logger.debug("Globals seguros adicionados para ultralytics")
            except (ImportError, AttributeError) as e:
                # Se não conseguir importar ou método não existir, tentar carregar mesmo assim
                logger.debug(f"Não foi possível adicionar globals seguros: {e}")
            
            # Verificar caminhos possíveis
            possible_paths = [
                settings.model_path,
                "./models/yolov8n.pt",
                "yolov8n.pt",
                os.path.join(os.path.dirname(__file__), "..", "models", "yolov8n.pt")
            ]
            
            model_loaded = False
            for model_path in possible_paths:
                if os.path.exists(model_path):
                    try:
                        logger.info(f"Tentando carregar modelo YOLO de: {model_path}")
                        # YOLO já lida com weights_only internamente nas versões mais recentes
                        self.model = YOLO(model_path)
                        logger.info(f"✅ Modelo YOLO carregado com sucesso de: {model_path}")
                        model_loaded = True
                        break
                    except Exception as inner_e:
                        error_msg = str(inner_e)
                        logger.warning(f"Falha ao carregar {model_path}: {error_msg[:200]}")
                        # Verificar se é erro de weights_only (PyTorch 2.6+)
                        if "weights_only" in error_msg or "WeightsUnpickler" in error_msg:
                            logger.warning("⚠️ Erro relacionado a PyTorch 2.6+ weights_only")
                            logger.warning("💡 Solução: pip install --upgrade ultralytics")
                        continue
            
            # Se nenhum arquivo local funcionou, tentar baixar automaticamente
            if not model_loaded:
                try:
                    logger.warning("Nenhum modelo local encontrado, tentando baixar yolov8n.pt automaticamente...")
                    # YOLO nas versões mais recentes já lida com PyTorch 2.6+
                    self.model = YOLO('yolov8n.pt')
                    logger.info("✅ Modelo YOLO baixado e carregado com sucesso")
                    model_loaded = True
                except Exception as download_e:
                    error_msg = str(download_e)
                    if "weights_only" in error_msg or "WeightsUnpickler" in error_msg:
                        logger.error("❌ Erro: PyTorch 2.6+ requer atualização do ultralytics")
                        logger.error("💡 Solução 1 (Recomendado): pip install --upgrade ultralytics")
                        logger.error("💡 Solução 2: pip install 'torch<2.6'")
                        logger.error("💡 Solução 3: Baixar modelo manualmente de https://github.com/ultralytics/assets/releases")
                    else:
                        logger.error(f"❌ Erro ao baixar/carregar modelo YOLO: {error_msg[:200]}")
                    self.model = None
            
            if not model_loaded:
                logger.error("❌ CRÍTICO: Modelo YOLO não pôde ser carregado! Detecção não funcionará.")
                logger.error("💡 Dica: Tente executar: pip install --upgrade ultralytics")
                self.model = None
                
        except Exception as e:
            logger.error(f"❌ Erro crítico ao carregar modelo YOLO: {e}", exc_info=True)
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

    def start_monitoring(self, camera_id: int, stream_url: str, user_email: Optional[str] = None):
        """Iniciar monitoramento de câmera
        
        Args:
            camera_id: ID da câmera
            stream_url: URL do stream
            user_email: Email do usuário logado (opcional)
        """
        if camera_id in self.active_monitors:
            logger.info(f"Parando monitoramento existente da câmera {camera_id} antes de reiniciar")
            self.stop_monitoring(camera_id)

        self.active_monitors[camera_id] = True
        
        # Armazenar email do usuário logado
        if user_email:
            self.camera_user_emails[camera_id] = user_email
            logger.info(f"Email do usuário logado armazenado para câmera {camera_id}: {user_email}")
        
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
        logger.info(f"✅ Monitoramento avançado INICIADO para câmera {camera_id} - URL: {stream_url}")
    
    def is_monitoring_active(self, camera_id: int) -> bool:
        """Verificar se monitoramento está ativo para uma câmera"""
        return self.active_monitors.get(camera_id, False)
    
    def get_active_monitors(self) -> List[int]:
        """Obter lista de IDs de câmeras com monitoramento ativo"""
        return [cam_id for cam_id, active in self.active_monitors.items() if active]

    def stop_monitoring(self, camera_id: int):
        """Parar monitoramento de câmera"""
        # Remover email armazenado
        if camera_id in self.camera_user_emails:
            del self.camera_user_emails[camera_id]
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
            
            logger.info(f"Conectado à câmera {camera_id} - URL: {stream_url}")
            
            # Validar modelo YOLO
            if not self.is_model_loaded():
                logger.error(f"Modelo YOLO não está carregado! Detecção não funcionará para câmera {camera_id}")
                return
            
            # Obter configurações da câmera
            db = SessionLocal()
            camera = db.query(Camera).filter(Camera.id == camera_id).first()
            if not camera:
                logger.error(f"Câmera {camera_id} não encontrada no banco de dados")
                db.close()
                return
            
            if not camera.detection_enabled:
                logger.info(f"Detecção desabilitada para câmera {camera_id}")
                db.close()
                return

            # Configurações de detecção
            # Sensibilidade em faixa segura
            sensitivity = max(0.25, min(0.7, (camera.sensitivity or 50) / 100.0))
            detection_line = camera.detection_line
            detection_zone = camera.detection_zone
            
            logger.info(f"Configurações da câmera {camera_id}: sensitivity={sensitivity:.2f}, "
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
                        if frame_count % 30 == 0:
                            logger.debug(f"Câmera {camera_id}: Em cooldown ({self.detection_cooldown - time_since_last:.1f}s restantes)")
                        continue
                    
                    # Log periódico para debug
                    if frame_count % 30 == 0:
                        logger.info(f"📹 Câmera {camera_id}: Processando frame {frame_count} (zona={'✅' if detection_zone else '❌'}, linha={'✅' if detection_line else '❌'})")
                    
                    # Detecção avançada
                    intrusion_detected = self._advanced_detection(
                        frame, camera_id, sensitivity, detection_line, detection_zone, bg_subtractor, kernel
                    )
                    
                    if intrusion_detected:
                        logger.warning(f"🚨🚨🚨 INTRUSÃO DETECTADA na câmera {camera_id} 🚨🚨🚨")
                        self.last_detection_time[camera_id] = current_time
                        self._handle_intrusion_advanced(
                            db, camera_id, frame, current_time
                        )

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
            # Parse das configurações uma vez
            line_config = self._parse_config(detection_line)
            zone_config = self._parse_config(detection_zone)
            
            # 1. Detecção de movimento com background subtraction
            motion_detected = self._detect_motion(frame, bg_subtractor, kernel)
            if motion_detected:
                logger.debug(f"Movimento detectado na câmera {camera_id}")
            
            # 2. Detecção de objetos com YOLO (se disponível)
            objects = self._detect_objects_yolo(frame, sensitivity) if self.model else []
            if objects:
                logger.info(f"🔍 YOLO detectou {len(objects)} objeto(s) na câmera {camera_id}: {[obj['class'] for obj in objects]}")
                # Log detalhado dos objetos
                for obj in objects:
                    logger.debug(f"  - {obj['class']}: conf={obj['confidence']:.2f}, area={obj['area']}, center=({obj['center'][0]}, {obj['center'][1]})")
            
            # 3. Se há zona configurada, verificar objetos YOLO diretamente
            # IMPORTANTE: Se há zona configurada, SÓ acionar se objeto estiver DENTRO da zona
            if zone_config and objects:
                zone_intrusion_found = False
                for obj in objects:
                    # Verificar se objeto está na zona
                    if self._check_zone_intrusion(obj['center'], zone_config, frame.shape):
                        logger.warning(f"🚨 INTRUSÃO DETECTADA: {obj['class']} está dentro da zona delimitada! "
                                     f"(confiança: {obj['confidence']:.2f}, centro: {obj['center']})")
                        zone_intrusion_found = True
                        return True  # Retornar imediatamente quando encontrar intrusão na zona
                    else:
                        logger.debug(f"  - {obj['class']} NÃO está na zona (centro: {obj['center']})")
                
                # Se há zona configurada mas NENHUM objeto está na zona, NÃO acionar intrusão
                if not zone_intrusion_found:
                    logger.debug(f"  ℹ️ Objetos detectados mas NENHUM está dentro da zona delimitada - não acionando intrusão")
                    # Se há zona configurada, não continuar com outras verificações (linha ou modo básico)
                    # Retornar False para não acionar intrusão
                    return False
            
            # 4. Rastreamento de objetos (para linha ou modo básico - apenas se NÃO há zona configurada)
            # Se há zona configurada, já verificamos acima e retornamos
            if not zone_config:
                # Se há linha configurada, precisa rastrear para detectar cruzamento
                if line_config:
                    tracked_objects = self._track_objects(frame, camera_id, objects)
                    if tracked_objects:
                        logger.info(f"📊 {len(tracked_objects)} objeto(s) sendo rastreado(s) na câmera {camera_id}")
                        intrusion = self._check_advanced_intrusion(
                            frame, tracked_objects, detection_line, detection_zone
                        )
                        if intrusion:
                            logger.warning(f"🚨 INTRUSÃO DETECTADA via rastreamento (câmera {camera_id})")
                            return True
                else:
                    # MODO BÁSICO: Sem zona nem linha - verificar diretamente objetos detectados
                    # Não precisa rastrear, pode acionar imediatamente
                    if objects:
                        logger.debug(f"🔍 Modo básico: verificando {len(objects)} objeto(s) detectado(s) diretamente")
                        intrusion = self._check_advanced_intrusion(
                            frame, objects, detection_line, detection_zone
                        )
                        if intrusion:
                            logger.warning(f"🚨 INTRUSÃO DETECTADA via modo básico (câmera {camera_id})")
                            return True
                        else:
                            logger.debug(f"  ⚠️ Objetos detectados mas não acionaram intrusão (verificar critérios)")
            
            # 6. Se não há objetos YOLO mas houve movimento e existe zona, verificar movimento na zona
            # IMPORTANTE: Só verificar movimento se não há objetos YOLO (para evitar duplicação)
            if motion_detected and zone_config and not objects:
                # Obter centro do movimento para verificar se está na zona
                motion_center = self._get_motion_center(frame, bg_subtractor, kernel)
                if motion_center:
                    if self._check_zone_intrusion(motion_center, zone_config, frame.shape):
                        logger.warning(f"🚨 INTRUSÃO DETECTADA na zona por movimento (câmera {camera_id}, centro: {motion_center})")
                        return True
                    else:
                        logger.debug(f"Movimento detectado mas NÃO está na zona (centro: {motion_center}) - não acionando intrusão")
                        # Se há zona configurada e movimento não está na zona, não acionar
                        return False
            
            # 7. Se há zona configurada mas não detectamos nada na zona, retornar False
            if zone_config:
                logger.debug(f"  ℹ️ Zona configurada mas nenhuma intrusão detectada dentro dela")
                return False
            
            return False
            
        except Exception as e:
            logger.error(f"Erro na detecção avançada (câmera {camera_id}): {e}", exc_info=True)
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
                logger.warning("Modelo YOLO não disponível - detecção não funcionará")
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
            logger.error(f"Erro na detecção YOLO: {e}", exc_info=True)
        
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
                        logger.warning(f"Intrusão detectada: cruzamento de linha por {obj['class']} "
                                     f"(confiança: {obj['confidence']:.2f})")
                        return True
            
            # Verificar entrada em zona (já verificado antes, mas manter para compatibilidade)
            if zone_config:
                for obj in objects:
                    if self._check_zone_intrusion(obj['center'], zone_config, frame.shape):
                        logger.warning(f"Intrusão detectada: entrada em zona por {obj['class']} "
                                     f"(confiança: {obj['confidence']:.2f})")
                        return True
            
            # MODO BÁSICO: Se não há linha nem zona configurada, detectar qualquer pessoa/carro na cena
            if not line_config and not zone_config:
                # Filtrar apenas objetos com alta confiança e área significativa
                for obj in objects:
                    conf_ok = obj['confidence'] >= 0.6
                    area_ok = obj['area'] > 2000
                    if conf_ok and area_ok:
                        logger.warning(f"🚨 INTRUSÃO DETECTADA (modo básico): {obj['class']} detectado "
                                     f"(confiança: {obj['confidence']:.2f}, área: {obj['area']} pixels)")
                        return True
                    else:
                        # Log detalhado quando não atende critérios
                        logger.debug(f"  ⚠️ {obj['class']} não atende critérios: conf={obj['confidence']:.2f} {'✅' if conf_ok else '❌'} (precisa >=0.6), "
                                   f"área={obj['area']} {'✅' if area_ok else '❌'} (precisa >2000px)")
                # Log quando detecta objetos mas não atende critérios
                if objects:
                    obj_details = [(o['class'], f"{o['confidence']:.2f}", o['area']) for o in objects]
                    logger.info(f"  ℹ️ {len(objects)} objeto(s) detectado(s) mas não atendem critérios de intrusão "
                               f"(precisa conf>=0.6 e área>2000px): {obj_details}")
            
            return False
            
        except Exception as e:
            logger.error(f"Erro na verificação de intrusão: {e}", exc_info=True)
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
                logger.warning("Configuração de linha inválida (todos pontos são 0)")
                return False
            
            # Calcular distância do ponto à linha
            distance = self._point_to_line_distance(px, py, x1, y1, x2, y2)
            
            # Threshold aumentado para 50 pixels (menos restritivo)
            threshold = 50
            is_crossing = distance < threshold
            
            if is_crossing:
                logger.debug(f"Objeto próximo da linha: distância={distance:.1f}px < threshold={threshold}px")
            
            return is_crossing
            
        except Exception as e:
            logger.error(f"Erro na verificação de linha: {e}", exc_info=True)
            return False

    def _check_zone_intrusion(self, point: List[int], zone_config: Dict, frame_shape: Optional[Tuple[int,int,int]] = None) -> bool:
        """Verificar se ponto está em alguma das zonas (suporta múltiplas zonas)"""
        try:
            px, py = point
            
            # Suportar múltiplas zonas (novo formato) ou zona única (formato antigo)
            zones_to_check = []
            if 'zones' in zone_config and isinstance(zone_config['zones'], list):
                # Novo formato: múltiplas zonas
                zones_to_check = zone_config['zones']
            elif 'points' in zone_config:
                # Formato antigo: zona única (compatibilidade)
                zones_to_check = [zone_config]
            else:
                logger.warning(f"Formato de zona inválido: {zone_config}")
                return False
            
            if not zones_to_check:
                return False
            
            ref_w = zone_config.get('ref_w')
            ref_h = zone_config.get('ref_h')
            
            # Verificar se ponto está em alguma das zonas
            for zone in zones_to_check:
                points = zone.get('points', [])
                
                if len(points) < 3:
                    continue  # Pular zonas inválidas
                
                # Ajustar escala se config tiver referência de largura/altura
                if frame_shape is not None and ref_w and ref_h and ref_w > 0 and ref_h > 0:
                    h, w = frame_shape[0], frame_shape[1]
                    sx = w / float(ref_w)
                    sy = h / float(ref_h)
                    points = [{ 'x': p['x'] * sx, 'y': p['y'] * sy } for p in points]
                
                # Converter pontos para formato numpy
                polygon_points = np.array([[p['x'], p['y']] for p in points], np.int32)
                
                # Verificar se ponto está dentro do polígono
                inside = cv2.pointPolygonTest(polygon_points, (px, py), False)
                
                if inside >= 0:
                    logger.info(f"✅ Ponto ({px}, {py}) está DENTRO da zona '{zone.get('name', 'zona')}' (distância: {inside:.1f})")
                    return True  # Encontrou em uma zona, retornar True
            
            logger.debug(f"❌ Ponto ({px}, {py}) está FORA de todas as zonas")
            return False
            
        except Exception as e:
            logger.error(f"Erro na verificação de zona: {e}", exc_info=True)
            return False
    
    def _get_motion_center(self, frame: np.ndarray, bg_subtractor, kernel) -> Optional[List[int]]:
        """Obter centro do movimento detectado"""
        try:
            # Aplicar background subtraction
            fg_mask = bg_subtractor.apply(frame)
            
            # Operações morfológicas para limpar ruído
            fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel)
            fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel)
            
            # Encontrar contornos
            contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            if not contours:
                return None
            
            # Encontrar o maior contorno (movimento mais significativo)
            largest_contour = max(contours, key=cv2.contourArea)
            area = cv2.contourArea(largest_contour)
            
            # Verificar se área é significativa
            h, w = frame.shape[:2]
            min_area = max(800, int((w * h) * 0.0006))
            if area < min_area:
                return None
            
            # Calcular centro do contorno
            M = cv2.moments(largest_contour)
            if M["m00"] == 0:
                return None
            
            cx = int(M["m10"] / M["m00"])
            cy = int(M["m01"] / M["m00"])
            
            return [cx, cy]
            
        except Exception as e:
            logger.error(f"Erro ao obter centro do movimento: {e}")
            return None

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
            # Obter informações da câmera para melhorar descrição
            camera = db.query(Camera).filter(Camera.id == camera_id).first()
            camera_name = camera.name if camera else f"Câmera {camera_id}"
            
            # Verificar se tem zona ou linha configurada
            has_zone = camera and camera.detection_zone
            has_line = camera and camera.detection_line
            
            # Criar descrição mais detalhada
            if has_zone:
                description = f"Intrusão detectada na zona delimitada - {camera_name}"
            elif has_line:
                description = f"Intrusão detectada - cruzamento de linha - {camera_name}"
            else:
                description = f"Intrusão detectada - {camera_name}"
            
            # Garantir que diretório existe
            screenshot_dir = os.path.join(settings.upload_dir, "screenshots")
            os.makedirs(screenshot_dir, exist_ok=True)
            
            # Salvar screenshot com qualidade melhor
            timestamp_str = datetime.fromtimestamp(timestamp).strftime('%Y%m%d_%H%M%S_%f')[:-3]
            filename = f"intrusion_{camera_id}_{timestamp_str}.jpg"
            filepath = os.path.join(screenshot_dir, filename)
            # URL pública para o frontend (sempre com barras)
            public_url = f"/uploads/screenshots/{filename}"
            
            # Salvar com qualidade JPEG 95
            success = cv2.imwrite(filepath, frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
            if not success:
                logger.error(f"Falha ao salvar screenshot: {filepath}")
                filepath = None
                public_url = None
            else:
                logger.info(f"Screenshot salvo com sucesso: {filepath}")
            
            # Criar evento com EventType correto
            event = Event(
                camera_id=camera_id,
                event_type=EventType.INTRUSION.value,
                confidence=0.9,  # Alta confiança para detecção avançada
                description=description,
                image_path=public_url if public_url else None,
                timestamp=datetime.fromtimestamp(timestamp),
                is_processed=True,
                is_notified=False
            )
            
            db.add(event)
            db.commit()
            db.refresh(event)
            
            logger.info(f"✅ Evento de intrusão registrado: ID={event.id}, Câmera={camera_id}, "
                          f"Timestamp={timestamp_str}, Imagem={'OK' if filepath else 'FALHOU'}, "
                          f"URL={public_url}")
            
            # Enviar notificação WebSocket de forma síncrona
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
                # Usar run_coroutine_threadsafe para executar async em contexto síncrono
                try:
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        # Se já existe um loop rodando, criar task
                        loop.create_task(manager.broadcast(payload))
                    else:
                        # Se não há loop, executar diretamente
                        loop.run_until_complete(manager.broadcast(payload))
                except RuntimeError:
                    # Se não há loop, criar um novo
                    asyncio.run(manager.broadcast(payload))
            except Exception as notif_error:
                logger.warning(f"Falha ao enviar notificação WebSocket: {notif_error}")
            
            # Enviar email de alerta (em thread separada para não bloquear)
            try:
                from services.email_service import email_service
                from models.user import User
                
                # Buscar email do usuário logado que iniciou o monitoramento
                recipient_emails = []
                
                # Prioridade 1: Email do usuário logado que iniciou o monitoramento
                logged_user_email = self.camera_user_emails.get(camera_id)
                if logged_user_email:
                    recipient_emails.append(logged_user_email)
                    logger.info(f"Enviando email para usuário logado: {logged_user_email}")
                else:
                    # Fallback: Verificar modo de destinatários configurado
                    alert_mode = getattr(settings, 'alert_recipient_mode', 'admins_only')
                    alert_emails_config = getattr(settings, 'alert_emails', None)
                    
                    if alert_mode == 'all_users':
                        # Enviar para todos os usuários ativos
                        users_to_notify = db.query(User).filter(
                            User.is_active == True
                        ).all()
                        recipient_emails = [user.email for user in users_to_notify]
                    elif alert_mode == 'admins_only':
                        # Enviar apenas para administradores ativos
                        users_to_notify = db.query(User).filter(
                            User.is_active == True,
                            User.role == 'admin'
                        ).all()
                        recipient_emails = [user.email for user in users_to_notify]
                    elif alert_mode == 'custom':
                        # Usar apenas emails configurados manualmente
                        recipient_emails = []
                    
                    # Adicionar emails customizados (se configurados)
                    if alert_emails_config:
                        custom_emails = [email.strip() for email in alert_emails_config.split(',') if email.strip()]
                        recipient_emails.extend(custom_emails)
                    
                    # Remover duplicatas
                    recipient_emails = list(set(recipient_emails))
                
                if recipient_emails and email_service.is_configured():
                    # Verificar cooldown de email (evitar spam)
                    last_email = self.last_email_time.get(camera_id, 0)
                    time_since_last_email = timestamp - last_email
                    
                    if time_since_last_email < self.email_cooldown:
                        remaining = self.email_cooldown - time_since_last_email
                        logger.debug(f"Email em cooldown para câmera {camera_id} ({remaining:.1f}s restantes)")
                    else:
                        # Atualizar timestamp do último email
                        self.last_email_time[camera_id] = timestamp
                        
                        # Enviar email em thread separada para não bloquear
                        import threading
                        def send_email_async():
                            timestamp_str = datetime.fromtimestamp(timestamp).strftime('%d/%m/%Y %H:%M:%S')
                            logger.info(f"📧 Enviando email de alerta para {len(recipient_emails)} destinatário(s) - Câmera: {camera_name}")
                            
                            # Usar o caminho absoluto do arquivo para garantir que a imagem seja encontrada
                            # Normalizar o caminho para evitar problemas com barras/contrabarras
                            image_path_for_email = None
                            if filepath:
                                # Converter para caminho absoluto normalizado
                                abs_path = os.path.abspath(filepath)
                                if os.path.exists(abs_path):
                                    image_path_for_email = abs_path
                                    logger.info(f"📷 Imagem da intrusão será anexada: {os.path.basename(image_path_for_email)}")
                                else:
                                    logger.warning(f"⚠️ Imagem não encontrada no caminho: {abs_path}")
                            
                            email_service.send_intrusion_alert(
                                to_emails=recipient_emails,
                                camera_name=camera_name,
                                event_description=description,
                                timestamp=timestamp_str,
                                confidence=event.confidence,
                                image_path=image_path_for_email
                            )
                            # Marcar evento como notificado
                            try:
                                event.is_notified = True
                                db.commit()
                            except Exception as e:
                                logger.warning(f"Erro ao marcar evento como notificado: {e}")
                        
                        email_thread = threading.Thread(target=send_email_async, daemon=True)
                        email_thread.start()
                        logger.info(f"✅ Thread de email iniciada para {len(recipient_emails)} destinatário(s)")
                else:
                    if not email_service.is_configured():
                        logger.debug("Serviço de email não configurado, pulando envio")
                    else:
                        logger.debug("Nenhum usuário para notificar por email")
            except Exception as email_error:
                logger.warning(f"Erro ao enviar email de alerta: {email_error}")
            
        except Exception as e:
            logger.error(f"Erro ao processar intrusão (câmera {camera_id}): {e}", exc_info=True)
            if db:
                db.rollback()

    # Métodos públicos para acesso da API
    def test_detection(self, frame: np.ndarray, sensitivity: float) -> List[Dict]:
        """
        Método público para testar detecção de objetos.
        Usado pela API para testes de detecção.
        """
        return self._detect_objects_yolo(frame, sensitivity)

    def test_tracking(self, frame: np.ndarray, camera_id: int, objects: List[Dict]) -> List[Dict]:
        """
        Método público para testar rastreamento de objetos.
        Usado pela API para testes de detecção.
        """
        return self._track_objects(frame, camera_id, objects)

    def test_intrusion_check(self, frame: np.ndarray, objects: List[Dict], 
                            detection_line: Optional[str], detection_zone: Optional[str]) -> bool:
        """
        Método público para testar verificação de intrusão.
        Usado pela API para testes de detecção.
        """
        return self._check_advanced_intrusion(frame, objects, detection_line, detection_zone)


# Instância global do serviço
detection_service = DetectionService()

