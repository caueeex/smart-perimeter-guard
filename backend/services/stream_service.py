"""
Serviço de streaming para converter RTSP para formatos compatíveis com navegador
"""
import cv2
import threading
import time
import base64
import io
from PIL import Image
from typing import Dict, Optional
import asyncio
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import uvicorn

class StreamService:
    """Serviço para gerenciar streams de câmeras"""
    
    def __init__(self):
        self.active_streams: Dict[int, cv2.VideoCapture] = {}
        self.stream_threads: Dict[int, threading.Thread] = {}
        self.latest_frames: Dict[int, bytes] = {}
        self.stream_running: Dict[int, bool] = {}
        
    def start_stream(self, camera_id: int, stream_url: str):
        """Iniciar stream de câmera"""
        try:
            if camera_id in self.active_streams:
                self.stop_stream(camera_id)
                
            print(f"Iniciando stream para câmera {camera_id}: {stream_url}")
            
            # Conectar à câmera
            if stream_url.startswith("webcam://"):
                camera_index = int(stream_url.split("://")[1])
                cap = cv2.VideoCapture(camera_index)
            else:
                cap = cv2.VideoCapture(stream_url)
                
            if not cap.isOpened():
                print(f"Erro ao conectar à câmera {camera_id} - URL: {stream_url}")
                return False
                
            # Configurar propriedades da câmera
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Reduzir buffer
            cap.set(cv2.CAP_PROP_FPS, 10)  # 10 FPS
            
            self.active_streams[camera_id] = cap
            self.stream_running[camera_id] = True
            
            # Iniciar thread de captura
            thread = threading.Thread(
                target=self._capture_frames,
                args=(camera_id, cap),
                daemon=True
            )
            self.stream_threads[camera_id] = thread
            thread.start()
            
            print(f"Stream iniciado com sucesso para câmera {camera_id}")
            return True
            
        except Exception as e:
            print(f"Erro ao iniciar stream da câmera {camera_id}: {str(e)}")
            return False
        
    def stop_stream(self, camera_id: int):
        """Parar stream de câmera"""
        if camera_id in self.stream_running:
            self.stream_running[camera_id] = False
            
        if camera_id in self.stream_threads:
            self.stream_threads[camera_id].join(timeout=2)
            del self.stream_threads[camera_id]
            
        if camera_id in self.active_streams:
            self.active_streams[camera_id].release()
            del self.active_streams[camera_id]
            
        if camera_id in self.latest_frames:
            del self.latest_frames[camera_id]
            
        print(f"Stream parado para câmera {camera_id}")
        
    def _capture_frames(self, camera_id: int, cap: cv2.VideoCapture):
        """Capturar frames da câmera"""
        frame_count = 0
        try:
            while self.stream_running.get(camera_id, False):
                ret, frame = cap.read()
                if not ret:
                    print(f"Erro ao ler frame da câmera {camera_id}")
                    time.sleep(0.2)
                    continue
                    
                # Converter frame para JPEG
                _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                frame_bytes = buffer.tobytes()
                
                # Armazenar frame mais recente
                self.latest_frames[camera_id] = frame_bytes
                frame_count += 1
                
                if frame_count % 100 == 0:  # Log a cada 100 frames
                    print(f"Câmera {camera_id}: {frame_count} frames capturados")
                
                time.sleep(0.1)  # 10 FPS
                
        except Exception as e:
            print(f"Erro na captura de frames da câmera {camera_id}: {e}")
        finally:
            print(f"Captura de frames finalizada para câmera {camera_id}")
            if camera_id in self.active_streams:
                self.active_streams[camera_id].release()
                
    def get_latest_frame(self, camera_id: int) -> Optional[bytes]:
        """Obter frame mais recente"""
        return self.latest_frames.get(camera_id)
        
    def generate_mjpeg_stream(self, camera_id: int):
        """Gerar stream MJPEG para o navegador"""
        def generate():
            while self.stream_running.get(camera_id, False):
                frame = self.get_latest_frame(camera_id)
                if frame:
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
                time.sleep(0.033)  # ~30 FPS
                
        return generate()
        
    def get_frame_as_base64(self, camera_id: int) -> Optional[str]:
        """Obter frame como base64"""
        frame = self.get_latest_frame(camera_id)
        if frame:
            return base64.b64encode(frame).decode('utf-8')
        return None
        
    def is_stream_active(self, camera_id: int) -> bool:
        """Verificar se stream está ativo"""
        return self.stream_running.get(camera_id, False)
        
    def get_stream_info(self, camera_id: int) -> Dict:
        """Obter informações do stream"""
        if camera_id not in self.active_streams:
            return {"active": False}
            
        cap = self.active_streams[camera_id]
        return {
            "active": True,
            "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            "fps": cap.get(cv2.CAP_PROP_FPS)
        }

# Instância global do serviço
stream_service = StreamService()
