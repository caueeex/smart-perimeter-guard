# SecureVision - Arquitetura do Sistema

## 📋 Visão Geral

Sistema inteligente de monitoramento por câmeras com detecção de invasão baseado em IA. Este documento descreve a arquitetura completa do projeto integrador.

## 🏗️ Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONT-END                             │
│                    (React + TypeScript)                      │
│  - Dashboard de Monitoramento                                │
│  - Gerenciamento de Câmeras                                  │
│  - Histórico de Eventos                                      │
│  - Notificações em Tempo Real                                │
└──────────────────┬──────────────────────────────────────────┘
                   │ REST API / WebSocket
┌──────────────────▼──────────────────────────────────────────┐
│                        BACK-END                              │
│                    (Python + FastAPI)                        │
│  Microserviços:                                              │
│  - Autenticação (JWT)                                        │
│  - Gerenciamento de Câmeras                                  │
│  - Processamento de Eventos                                  │
│  - Notificações                                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                    MÓDULO DE IA                              │
│                  (OpenCV + TensorFlow)                       │
│  - Detecção de Movimento                                     │
│  - Identificação de Invasão                                  │
│  - Classificação de Objetos                                  │
│  - Geração de Heatmap                                        │
│  - Captura de Screenshots + Vídeo                            │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                    BANCO DE DADOS                            │
│              (PostgreSQL / MongoDB)                          │
│  - Usuários e Permissões                                     │
│  - Configurações de Câmeras                                  │
│  - Registro de Eventos                                       │
│  - Storage de Imagens/Vídeos                                 │
└─────────────────────────────────────────────────────────────┘
```

## ✅ Implementado (Front-end)

### 1. Interface Completa
- ✅ **Login/Autenticação** - Tela de login responsiva
- ✅ **Dashboard** - Visão geral com estatísticas em tempo real
- ✅ **Gerenciamento de Câmeras** - CRUD completo
- ✅ **Histórico de Eventos** - Timeline com filtros avançados
- ✅ **Design System** - Tema dark/blue com gradientes e animações

### 2. Componentes
- ✅ Sidebar com navegação
- ✅ Cards de estatísticas
- ✅ Grid de câmeras
- ✅ Timeline de eventos
- ✅ Modais de configuração
- ✅ Sistema de badges e alertas

### 3. Design & UX
- ✅ Tema profissional de segurança
- ✅ Responsivo (mobile/tablet/desktop)
- ✅ Animações e transições suaves
- ✅ Shadow effects e glows
- ✅ Semantic tokens (design system)

## 🚧 A Implementar

### 1. Back-end Python (Obrigatório)

#### Estrutura de Microserviços
```python
# Exemplo de estrutura do projeto Python
projeto-backend/
├── services/
│   ├── auth_service.py       # Autenticação JWT
│   ├── camera_service.py     # Gerenciamento de câmeras
│   ├── detection_service.py  # Serviço de detecção
│   └── notification_service.py
├── models/
│   ├── user.py
│   ├── camera.py
│   └── event.py
├── ai/
│   ├── detector.py           # OpenCV + YOLO/TensorFlow
│   ├── classifier.py
│   └── heatmap_generator.py
└── main.py                   # FastAPI app
```

#### Requisitos do Back-end:
- **FastAPI** para APIs REST
- **WebSocket** para notificações em tempo real
- **JWT** para autenticação
- **PostgreSQL** ou **MongoDB** para persistência
- **Redis** para cache e filas (opcional)

### 2. Módulo de IA (Obrigatório)

#### Funcionalidades IA:
```python
# Exemplo de detector de invasão
import cv2
import tensorflow as tf

class InvasionDetector:
    def __init__(self, model_path):
        self.model = tf.keras.models.load_model(model_path)
        self.detection_line = None  # Linha configurada pelo usuário
    
    def detect_intrusion(self, frame):
        """
        Detecta se objeto cruzou a linha de segurança
        Retorna: (invaded: bool, screenshot: bytes, objects: list)
        """
        # 1. Detectar objetos no frame (YOLO/TensorFlow)
        # 2. Verificar se cruzou a linha
        # 3. Capturar screenshot
        # 4. Salvar clip de vídeo (5-10 segundos)
        # 5. Classificar objeto (pessoa, carro, animal)
        pass
    
    def generate_heatmap(self, events):
        """
        Gera mapa de calor das áreas mais movimentadas
        """
        pass
```

#### Modelos Sugeridos:
- **YOLO v8** - Detecção de objetos em tempo real
- **OpenCV** - Processamento de vídeo
- **MobileNet** - Classificação leve
- **TensorFlow/PyTorch** - Framework de IA

### 3. Integração Front-end ↔ Back-end

#### Endpoints da API:
```typescript
// Exemplos de endpoints que o front-end espera

// Autenticação
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout

// Câmeras
GET /api/cameras
POST /api/cameras
PUT /api/cameras/:id
DELETE /api/cameras/:id
POST /api/cameras/:id/configure-zone

// Eventos
GET /api/events
GET /api/events/:id
GET /api/events/:id/image
GET /api/events/:id/video
POST /api/events/export

// WebSocket para notificações
WS /api/ws/notifications
```

### 4. Banco de Dados

#### Schema PostgreSQL:
```sql
-- Tabela de usuários
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'admin' ou 'user'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de câmeras
CREATE TABLE cameras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    stream_url VARCHAR(500),
    zone VARCHAR(50),
    detection_enabled BOOLEAN DEFAULT true,
    detection_line JSONB, -- Coordenadas da linha
    status VARCHAR(50) DEFAULT 'online',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de eventos
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camera_id UUID REFERENCES cameras(id),
    event_type VARCHAR(50), -- 'intrusion', 'movement', 'alert'
    timestamp TIMESTAMP DEFAULT NOW(),
    description TEXT,
    image_url VARCHAR(500),
    video_url VARCHAR(500),
    metadata JSONB, -- Objetos detectados, etc.
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 5. Notificações em Tempo Real

#### Implementação com WebSocket:
```python
# Backend (FastAPI)
from fastapi import WebSocket

@app.websocket("/ws/notifications")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        # Quando invasão detectada:
        await websocket.send_json({
            "type": "intrusion_alert",
            "camera_id": "uuid",
            "timestamp": "2025-10-02T14:32:15",
            "image_url": "...",
            "video_url": "..."
        })
```

```typescript
// Frontend (React)
const ws = new WebSocket('ws://localhost:8000/ws/notifications');
ws.onmessage = (event) => {
    const alert = JSON.parse(event.data);
    toast.error(`Invasão detectada: ${alert.camera_id}`);
    // Atualizar dashboard
};
```

## 🔄 Fluxo de Detecção de Invasão

```
1. Câmera IP → Stream RTSP/HTTP
2. Back-end Python → Captura frames do stream
3. Módulo IA → Processa frame
   - Detecta objetos
   - Verifica cruzamento da linha
4. Se invasão detectada:
   - Captura screenshot
   - Grava clipe de 5-10s
   - Salva no banco de dados
   - Envia notificação WebSocket
5. Front-end → Recebe notificação
   - Exibe alerta visual
   - Atualiza dashboard
   - Reproduz som de alerta
```

## 📦 Tecnologias

### Front-end (✅ Implementado)
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- shadcn/ui (componentes)
- React Router (navegação)
- TanStack Query (cache)

### Back-end (🚧 A Desenvolver)
- Python 3.10+
- FastAPI (API REST)
- Uvicorn (ASGI server)
- SQLAlchemy (ORM)
- PostgreSQL
- Redis (opcional)

### IA (🚧 A Desenvolver)
- OpenCV 4.x
- TensorFlow 2.x ou PyTorch
- YOLO v8 (detecção)
- NumPy, Pandas

## 🚀 Próximos Passos

1. **Habilitar Lovable Cloud** (banco de dados + autenticação)
2. **Desenvolver back-end Python** com microserviços
3. **Implementar módulo de IA** com OpenCV
4. **Integrar front-end com back-end**
5. **Testar detecção em tempo real**
6. **Deploy em produção**

## 📖 Documentação Adicional

- [Lovable Cloud Docs](https://docs.lovable.dev/features/cloud)
- [FastAPI Docs](https://fastapi.tiangolo.com)
- [OpenCV Python](https://docs.opencv.org/4.x/d6/d00/tutorial_py_root.html)
- [YOLO v8](https://docs.ultralytics.com)

---

**Nota:** Este front-end está pronto para integração com o back-end Python. A estrutura de dados, endpoints e fluxos estão documentados para facilitar o desenvolvimento do back-end e do módulo de IA.
