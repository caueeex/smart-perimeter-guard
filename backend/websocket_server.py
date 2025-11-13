"""
Servidor WebSocket para notificações em tempo real
"""
import asyncio
import json
import logging
from typing import Dict, Set
from datetime import datetime
import websockets
from websockets.server import WebSocketServerProtocol

from config import settings

logger = logging.getLogger(__name__)

# Armazenar conexões WebSocket
connections: Set[WebSocketServerProtocol] = set()


class WebSocketManager:
    """Gerenciador de conexões WebSocket"""
    
    def __init__(self):
        self.connections: Set[WebSocketServerProtocol] = set()
    
    async def register(self, websocket: WebSocketServerProtocol):
        """Registrar nova conexão"""
        self.connections.add(websocket)
        logger.info(f"Nova conexão WebSocket registrada. Total: {len(self.connections)}")
    
    async def unregister(self, websocket: WebSocketServerProtocol):
        """Remover conexão"""
        self.connections.discard(websocket)
        logger.info(f"Conexão WebSocket removida. Total: {len(self.connections)}")
    
    async def broadcast(self, message: dict):
        """Enviar mensagem para todas as conexões"""
        if not self.connections:
            return
        
        message_str = json.dumps(message)
        disconnected = set()
        
        for websocket in self.connections:
            try:
                await websocket.send(message_str)
            except websockets.exceptions.ConnectionClosed:
                disconnected.add(websocket)
        
        # Remover conexões desconectadas
        for websocket in disconnected:
            self.connections.discard(websocket)
        
        logger.info(f"Mensagem enviada para {len(self.connections)} conexões")
    
    async def send_to_user(self, user_id: str, message: dict):
        """Enviar mensagem para usuário específico"""
        # Implementar lógica para enviar para usuário específico
        # Por enquanto, enviar para todos
        await self.broadcast(message)


# Instância global do gerenciador
ws_manager = WebSocketManager()


async def handle_websocket(websocket: WebSocketServerProtocol, path: str):
    """Handler para conexões WebSocket"""
    await ws_manager.register(websocket)
    
    try:
        # Enviar mensagem de boas-vindas
        welcome_message = {
            "type": "connection",
            "message": "Conectado ao SecureVision WebSocket",
            "timestamp": datetime.now().isoformat()
        }
        await websocket.send(json.dumps(welcome_message))
        
        # Manter conexão viva
        async for message in websocket:
            try:
                data = json.loads(message)
                await handle_message(websocket, data)
            except json.JSONDecodeError:
                error_message = {
                    "type": "error",
                    "message": "Formato de mensagem inválido",
                    "timestamp": datetime.now().isoformat()
                }
                await websocket.send(json.dumps(error_message))
    
    except websockets.exceptions.ConnectionClosed:
        logger.info("Conexão WebSocket fechada")
    finally:
        await ws_manager.unregister(websocket)


async def handle_message(websocket: WebSocketServerProtocol, data: dict):
    """Processar mensagem recebida"""
    message_type = data.get("type")
    
    if message_type == "ping":
        # Responder ao ping
        pong_message = {
            "type": "pong",
            "timestamp": datetime.now().isoformat()
        }
        await websocket.send(json.dumps(pong_message))
    
    elif message_type == "subscribe":
        # Usuário quer se inscrever em notificações
        subscribe_message = {
            "type": "subscribed",
            "message": "Inscrito em notificações",
            "timestamp": datetime.now().isoformat()
        }
        await websocket.send(json.dumps(subscribe_message))
    
    else:
        # Tipo de mensagem não reconhecido
        error_message = {
            "type": "error",
            "message": f"Tipo de mensagem não reconhecido: {message_type}",
            "timestamp": datetime.now().isoformat()
        }
        await websocket.send(json.dumps(error_message))


async def send_intrusion_alert(camera_id: int, event_id: int, detections: list):
    """Enviar alerta de invasão"""
    alert_message = {
        "type": "intrusion_alert",
        "camera_id": camera_id,
        "event_id": event_id,
        "detections": detections,
        "timestamp": datetime.now().isoformat(),
        "message": f"Invasão detectada na câmera {camera_id}"
    }
    
    await ws_manager.broadcast(alert_message)
    logger.info(f"Alerta de invasão enviado: Câmera {camera_id}, Evento {event_id}")


async def send_system_notification(message: str, notification_type: str = "info"):
    """Enviar notificação do sistema"""
    notification = {
        "type": "system_notification",
        "notification_type": notification_type,
        "message": message,
        "timestamp": datetime.now().isoformat()
    }
    
    await ws_manager.broadcast(notification)
    logger.info(f"Notificação do sistema enviada: {message}")


async def start_websocket_server():
    """Iniciar servidor WebSocket"""
    logger.info(f"Iniciando servidor WebSocket na porta {settings.ws_port}")
    
    server = await websockets.serve(
        handle_websocket,
        "0.0.0.0",
        settings.ws_port,
        ping_interval=20,
        ping_timeout=10
    )
    
    logger.info("Servidor WebSocket iniciado com sucesso")
    return server


if __name__ == "__main__":
    # Iniciar servidor WebSocket
    asyncio.run(start_websocket_server())

