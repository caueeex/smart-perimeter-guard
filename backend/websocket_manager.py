from typing import Set
from fastapi import WebSocket


class WebSocketManager:
    def __init__(self) -> None:
        self.active: Set[WebSocket] = set()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.active.add(ws)

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self.active:
            self.active.discard(ws)

    async def broadcast(self, data: dict) -> None:
        # Envia para todos; remove conexões quebradas silenciosamente
        stale: Set[WebSocket] = set()
        for ws in list(self.active):
            try:
                await ws.send_json(data)
            except Exception:
                stale.add(ws)
        for ws in stale:
            self.disconnect(ws)


manager = WebSocketManager()


