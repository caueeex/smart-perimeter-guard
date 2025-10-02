"""
Aplicação principal FastAPI
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import uvicorn
import os

from config import settings
from database import create_tables
from api.v1 import api_router

# Criar aplicação FastAPI
app = FastAPI(
    title=settings.project_name,
    version=settings.version,
    description="Sistema Inteligente de Monitoramento por Câmeras",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especificar domínios
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
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Erro interno do servidor",
            "error": str(exc)
        }
    )


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

