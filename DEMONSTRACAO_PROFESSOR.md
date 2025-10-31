# 📚 Demonstração para o Professor - SecureVision

## 🎯 Pontos Solicitados e Localização no Código

---

## 1️⃣ **DEMONSTRAÇÃO USANDO PYTHON**

### 📍 **Onde encontrar:**
- **Arquivo principal:** `backend/main.py`
- **Execução:** `python main.py` (servidor FastAPI)
- **Documentação automática:** http://localhost:8000/docs

### 🔍 **Evidências:**
```python
# backend/main.py - Linhas 1-22
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
```

### 🚀 **Como demonstrar:**
1. Execute: `cd backend && python main.py`
2. Acesse: http://localhost:8000/docs
3. Mostre a documentação interativa da API
4. Teste endpoints em tempo real

---

## 2️⃣ **POO - CLASSES, OBJETOS, ATRIBUTOS E MÉTODOS**

### 📍 **Principais Classes Encontradas:**

#### **A) Classe DetectionService** 
**Arquivo:** `backend/services/detection_service.py` (Linhas 32-57)

```python
class DetectionService:
    """Serviço de detecção de invasão com IA"""

    def __init__(self):
        # ATRIBUTOS (Propriedades)
        self.active_monitors: Dict[int, bool] = {}
        self.camera_threads: Dict[int, threading.Thread] = {}
        self.model = None
        self.tracking_data: Dict[int, Dict] = {}
        self.motion_history: Dict[int, deque] = {}
        self.last_detection_time: Dict[int, float] = {}
        self.detection_cooldown = 3.0
        self.min_confidence = 0.5
        self.min_area = 1000
        self.tracking_threshold = 50
        self.bg_subtractors: Dict[int, cv2.BackgroundSubtractor] = {}
        
        self.load_model()

    # MÉTODOS (Comportamentos)
    def load_model(self):
        """Carregar modelo YOLO"""
        
    def start_monitoring(self, camera_id: int, stream_url: str):
        """Iniciar monitoramento de câmera"""
        
    def stop_monitoring(self, camera_id: int):
        """Parar monitoramento de câmera"""
        
    def _monitor_camera(self, camera_id: int, stream_url: str):
        """Monitorar câmera em thread separada"""
```

#### **B) Classe User (Modelo de Dados)**
**Arquivo:** `backend/models/user.py` (Linhas 16-31)

```python
class User(Base):
    """Modelo de usuário"""
    __tablename__ = "users"

    # ATRIBUTOS (Colunas do banco)
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # MÉTODO ESPECIAL
    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"
```

#### **C) Classe Camera (Modelo de Dados)**
**Arquivo:** `backend/models/camera.py` (Linhas 18-41)

```python
class Camera(Base):
    """Modelo de câmera"""
    __tablename__ = "cameras"

    # ATRIBUTOS
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    stream_url = Column(String(500), nullable=False)
    zone = Column(String(50), nullable=True)
    status = Column(String(50), default=CameraStatus.ONLINE, nullable=False)
    detection_enabled = Column(Boolean, default=True, nullable=False)
    detection_line = Column(JSON, nullable=True)
    detection_zone = Column(JSON, nullable=True)
    sensitivity = Column(Integer, default=50, nullable=False)
    fps = Column(Integer, default=15, nullable=False)
    resolution = Column(String(20), default="640x480", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # MÉTODO ESPECIAL
    def __repr__(self):
        return f"<Camera(id={self.id}, name='{self.name}', status='{self.status}')>"
```

#### **D) Classe Settings (Configuração)**
**Arquivo:** `backend/config.py` (Linhas 10-62)

```python
class Settings(BaseSettings):
    """Configurações da aplicação"""
    
    # ATRIBUTOS DE CONFIGURAÇÃO
    database_url: str = Field(default="mysql+pymysql://root:@localhost:3306/securevision", env="DATABASE_URL")
    db_host: str = Field(default="localhost", env="DB_HOST")
    db_port: int = Field(default=3306, env="DB_PORT")
    secret_key: str = Field(default="your-secret-key-here-change-in-production", env="SECRET_KEY")
    algorithm: str = Field(default="HS256", env="ALGORITHM")
    model_path: str = Field(default="./models/yolov8n.pt", env="MODEL_PATH")
    confidence_threshold: float = Field(default=0.5, env="CONFIDENCE_THRESHOLD")
    # ... mais atributos
```

### 🔍 **Outras Classes Importantes:**
- **AuthService:** `backend/services/auth_service.py`
- **CameraService:** `backend/services/camera_service.py`
- **EventService:** `backend/services/event_service.py`
- **StreamService:** `backend/services/stream_service.py`
- **WebSocketManager:** `backend/websocket_server.py`

---

## 3️⃣ **ARQUITETURA DE MICROSSERVIÇOS**

### 📍 **Estrutura de Microsserviços:**

#### **A) Organização Modular**
**Arquivo:** `backend/api/v1/__init__.py` (Linhas 1-19)

```python
# API v1 package
from fastapi import APIRouter
from .auth import router as auth_router
from .cameras import router as cameras_router
from .events import router as events_router
from .webcam import router as webcam_router
from .stream import router as stream_router
from .detection import router as detection_router
from .monitoring import router as monitoring_router

api_router = APIRouter()

# CADA MICROSSERVIÇO TEM SEU PRÓPRIO ROUTER
api_router.include_router(auth_router, prefix="/auth", tags=["authentication"])
api_router.include_router(cameras_router, prefix="/cameras", tags=["cameras"])
api_router.include_router(events_router, prefix="/events", tags=["events"])
api_router.include_router(webcam_router, prefix="/webcam", tags=["webcam"])
api_router.include_router(stream_router, prefix="/stream", tags=["stream"])
api_router.include_router(detection_router, prefix="/detection", tags=["detection"])
api_router.include_router(monitoring_router, prefix="/monitoring", tags=["monitoring"])
```

#### **B) Microsserviços Identificados:**

1. **🔐 Serviço de Autenticação** (`/auth`)
   - **Arquivo:** `backend/api/v1/auth.py`
   - **Responsabilidade:** Login, registro, tokens JWT

2. **📹 Serviço de Câmeras** (`/cameras`)
   - **Arquivo:** `backend/api/v1/cameras.py`
   - **Responsabilidade:** CRUD de câmeras, configurações

3. **📊 Serviço de Eventos** (`/events`)
   - **Arquivo:** `backend/api/v1/events.py`
   - **Responsabilidade:** Histórico, estatísticas, relatórios

4. **🎥 Serviço de Webcam** (`/webcam`)
   - **Arquivo:** `backend/api/v1/webcam.py`
   - **Responsabilidade:** Detecção de câmeras USB

5. **📡 Serviço de Stream** (`/stream`)
   - **Arquivo:** `backend/api/v1/stream.py`
   - **Responsabilidade:** Streaming de vídeo em tempo real

6. **🤖 Serviço de Detecção** (`/detection`)
   - **Arquivo:** `backend/api/v1/detection.py`
   - **Responsabilidade:** IA, linhas/zonas de detecção

7. **📈 Serviço de Monitoramento** (`/monitoring`)
   - **Arquivo:** `backend/api/v1/monitoring.py`
   - **Responsabilidade:** Status, métricas em tempo real

#### **C) Separação de Responsabilidades:**
```
backend/
├── api/v1/           # Camada de API (Microsserviços)
├── services/         # Lógica de Negócio
├── models/           # Modelos de Dados
├── schemas/          # Validação de Dados
├── config.py         # Configurações
└── database.py       # Conexão com Banco
```

---

## 4️⃣ **USO DE BIBLIOTECAS PYTHON**

### 📍 **Bibliotecas Principais:**

#### **A) Lista Completa** (`backend/requirements.txt`)
```txt
fastapi==0.104.1          # Framework web moderno
uvicorn==0.24.0           # Servidor ASGI
sqlalchemy==2.0.23        # ORM para banco de dados
alembic==1.12.1           # Migrações de banco
python-multipart==0.0.6   # Upload de arquivos
python-jose[cryptography]==3.3.0  # Tokens JWT
passlib[bcrypt]==1.7.4    # Hash de senhas
python-dotenv==1.0.0      # Variáveis de ambiente
psycopg2-binary==2.9.9    # Driver PostgreSQL
opencv-python==4.8.1.78  # Processamento de vídeo/imagem
ultralytics==8.0.196      # YOLO v8 para IA
pillow==10.1.0            # Processamento de imagens
numpy==1.24.3             # Computação numérica
requests==2.31.0          # Requisições HTTP
websockets==12.0          # Comunicação em tempo real
pydantic==2.5.0           # Validação de dados
pydantic-settings==2.0.3  # Configurações tipadas
```

#### **B) Demonstrações de Uso:**

**1. FastAPI + Uvicorn** (`backend/main.py`)
```python
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

app = FastAPI(title="SecureVision", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"])
```

**2. OpenCV + YOLO** (`backend/services/detection_service.py`)
```python
import cv2
import numpy as np
from ultralytics import YOLO

class DetectionService:
    def __init__(self):
        self.model = YOLO('yolov8n.pt')
        self.bg_subtractors: Dict[int, cv2.BackgroundSubtractor] = {}
    
    def _detect_objects_yolo(self, frame: np.ndarray, sensitivity: float):
        results = self.model(frame, conf=sensitivity, verbose=False)
        # Processamento com OpenCV...
```

**3. SQLAlchemy ORM** (`backend/models/user.py`)
```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    # ... mais campos
```

**4. Pydantic para Validação** (`backend/schemas/`)
```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class CameraCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    location: Optional[str] = Field(None, max_length=255)
    stream_url: str = Field(..., min_length=1, max_length=500)
    sensitivity: int = Field(50, ge=1, le=100)
```

**5. Threading para Concorrência** (`backend/services/detection_service.py`)
```python
import threading
import time

def start_monitoring(self, camera_id: int, stream_url: str):
    thread = threading.Thread(
        target=self._monitor_camera,
        args=(camera_id, stream_url),
        daemon=True
    )
    self.camera_threads[camera_id] = thread
    thread.start()
```

**6. NumPy para Processamento** (`backend/services/detection_service.py`)
```python
import numpy as np
from collections import deque

def _track_objects(self, frame: np.ndarray, camera_id: int, objects: List[Dict]):
    # Usar NumPy para cálculos matemáticos
    distance = np.sqrt(
        (center[0] - tracked_obj['center'][0])**2 + 
        (center[1] - tracked_obj['center'][1])**2
    )
```

---

## 🎯 **COMO DEMONSTRAR PARA O PROFESSOR**

### **1. Execução do Sistema:**
```bash
# Terminal 1 - Backend
cd backend
python main.py

# Terminal 2 - Frontend  
npm run dev
```

### **2. URLs para Demonstração:**
- **Sistema:** http://localhost:5173
- **API Docs:** http://localhost:8000/docs
- **Login:** admin@securevision.com / admin123

### **3. Pontos de Destaque:**
1. **POO:** Mostre as classes DetectionService, User, Camera
2. **Microsserviços:** Demonstre os diferentes endpoints da API
3. **Bibliotecas:** Mostre o uso de OpenCV, YOLO, FastAPI, SQLAlchemy
4. **Funcionalidade:** Adicione uma câmera e configure detecção

### **4. Arquivos-Chave para Mostrar:**
- `backend/main.py` - Aplicação principal
- `backend/services/detection_service.py` - IA e POO
- `backend/api/v1/__init__.py` - Arquitetura de microsserviços
- `backend/requirements.txt` - Bibliotecas Python
- `backend/models/` - Classes de modelo (POO)

---

## ✅ **RESUMO DOS REQUISITOS ATENDIDOS**

| Requisito | ✅ Status | Localização |
|-----------|-----------|-------------|
| **Demonstração Python** | ✅ Completo | `main.py`, API docs |
| **POO (Classes/Objetos)** | ✅ Completo | `models/`, `services/` |
| **Microsserviços** | ✅ Completo | `api/v1/` (7 serviços) |
| **Bibliotecas Python** | ✅ Completo | `requirements.txt` (17 libs) |

**🎉 Projeto 100% adequado para demonstração acadêmica!**
