"""
Aplicação principal FastAPI
"""
from fastapi import FastAPI, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import uvicorn
import os

from config import settings
from database import create_tables
from api.v1 import api_router
from sqlalchemy.orm import Session
from database import SessionLocal
from models.camera import Camera
from services.detection_service import detection_service
from websocket_manager import manager

# Criar aplicação FastAPI
app = FastAPI(
    title=settings.project_name,
    version=settings.version,
    description="Sistema Inteligente de Monitoramento por Câmeras",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configurar CORS (origens explícitas para evitar bloqueio com credenciais)
allowed_origins = [
    "http://localhost:8080",  # Vite/Dev
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir rotas da API
app.include_router(api_router, prefix=settings.api_v1_str)

# Servir arquivos estáticos
if os.path.exists(settings.upload_dir):
    app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.on_event("startup")
async def startup_event():
    """Eventos de inicialização"""
    print("🚀 Iniciando SecureVision...")
    
    # Criar tabelas do banco
    create_tables()
    print("✅ Tabelas do banco criadas")
    
    # Criar diretórios necessários
    os.makedirs(os.path.join(settings.upload_dir, "screenshots"), exist_ok=True)
    os.makedirs(os.path.join(settings.upload_dir, "videos"), exist_ok=True)
    print("✅ Diretórios criados")
    
    # Iniciar monitoramento para todas as câmeras com detecção habilitada
    try:
        db: Session = SessionLocal()
        cameras = db.query(Camera).all()
        started = 0
        for cam in cameras:
            if cam.detection_enabled and cam.stream_url:
                try:
                    detection_service.start_monitoring(cam.id, cam.stream_url)
                    started += 1
                except Exception as e:
                    print(f"Falha ao iniciar detecção para câmera {cam.id}: {e}")
        db.close()
        print(f"✅ Detecção iniciada para {started} câmera(s)")
    except Exception as e:
        print(f"⚠️ Não foi possível iniciar detecção automática: {e}")

    print("🎯 SecureVision iniciado com sucesso!")


@app.on_event("shutdown")
async def shutdown_event():
    """Eventos de finalização"""
    print("🛑 Parando SecureVision...")
    
    # Parar todos os monitoramentos
    try:
        from services.detection_service import detection_service
        for camera_id in list(detection_service.active_monitors.keys()):
            detection_service.stop_monitoring(camera_id)
    except Exception as e:
        print(f"Erro ao parar monitoramentos: {e}")
    
    print("✅ SecureVision parado com sucesso!")


@app.get("/")
async def root():
    """Endpoint raiz"""
    return {
        "message": "SecureVision API",
        "version": settings.version,
        "docs": "/docs",
        "status": "online"
    }


@app.get("/health")
async def health_check():
    """Verificação de saúde da API"""
    return {
        "status": "healthy",
        "version": settings.version,
        "timestamp": "2024-01-01T00:00:00Z"
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handler global de exceções"""
    origin = request.headers.get("origin") or "*"
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Erro interno do servidor",
            "error": str(exc)
        },
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Vary": "Origin",
        }
    )


@app.websocket('/ws')
async def ws_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        # Mantém a conexão aberta; o cliente pode enviar pings opcionais
        while True:
            await ws.receive_text()
    except Exception:
        pass
    finally:
        manager.disconnect(ws)

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

