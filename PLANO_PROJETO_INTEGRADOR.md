# PLANO DO PROJETO INTEGRADOR
## Smart Perimeter Guard - Sistema Inteligente de Monitoramento e Vigilância

---

## 📋 INFORMAÇÕES GERAIS

**Nome do Projeto:** Smart Perimeter Guard  
**Disciplina:** Projeto Integrador  
**Data de Entrega:** 02/10/2025  
**Equipe:** [Nome dos integrantes]  
**Orientador:** [Nome do professor]  

---

## 🎯 1. DESCRIÇÃO DA APLICAÇÃO

### 1.1 Visão Geral
O **Smart Perimeter Guard** é um sistema inteligente de monitoramento e vigilância que utiliza Inteligência Artificial para detectar automaticamente invasões e movimentos suspeitos através de câmeras IP. O sistema combina tecnologias modernas de visão computacional, desenvolvimento web e arquitetura de microsserviços para criar uma solução robusta e escalável de segurança.

### 1.2 Objetivos do Projeto
- **Objetivo Principal:** Desenvolver um sistema de vigilância inteligente que detecte automaticamente invasões e movimentos em tempo real
- **Objetivos Específicos:**
  - Implementar detecção de objetos usando IA (YOLO v8)
  - Criar interface web responsiva para monitoramento
  - Desenvolver arquitetura de microsserviços com Python
  - Garantir qualidade através de testes automatizados
  - Implementar notificações em tempo real
  - Criar sistema de histórico e relatórios

### 1.3 Justificativa
A necessidade de sistemas de segurança mais inteligentes e automatizados é crescente. Este projeto demonstra a aplicação prática de conceitos de:
- Programação Orientada a Objetos
- Arquitetura de Software
- Inteligência Artificial
- Desenvolvimento Full-Stack
- Qualidade de Software

---

## 🔧 2. REQUISITOS TÉCNICOS DO PROJETO

### 2.1 Requisito 1: Linguagem Python
**Descrição:** Todo o backend do sistema será desenvolvido em Python, aproveitando sua versatilidade e robustez para desenvolvimento web e IA.

**Aplicação no Projeto:**
- **FastAPI:** Framework web moderno para criação de APIs REST
- **OpenCV:** Processamento de vídeo e análise de imagens
- **YOLO v8:** Detecção de objetos em tempo real
- **SQLAlchemy:** ORM para manipulação de banco de dados
- **Pydantic:** Validação de dados e serialização

**Arquivos Principais:**
```
backend/
├── main.py                 # Aplicação principal FastAPI
├── config.py              # Configurações do sistema
├── database.py            # Configuração do banco de dados
├── services/              # Serviços de negócio
│   ├── auth_service.py    # Autenticação JWT
│   ├── camera_service.py  # Gerenciamento de câmeras
│   ├── detection_service.py # Detecção de objetos
│   └── event_service.py   # Gerenciamento de eventos
└── ai/                    # Módulo de IA
    └── heatmap_generator.py # Geração de mapas de calor
```

### 2.2 Requisito 2: Programação Orientada a Objetos
**Descrição:** O projeto implementa conceitos fundamentais de POO como encapsulamento, herança, polimorfismo e abstração.

**Aplicação no Projeto:**

#### Classes Principais:
```python
# Modelo de Câmera (Encapsulamento)
class Camera(Base):
    def __init__(self, name, stream_url, location):
        self._name = name
        self._stream_url = stream_url
        self._location = location
        self._status = CameraStatus.ONLINE
    
    def get_status(self):
        return self._status
    
    def update_status(self, new_status):
        self._status = new_status
        self._validate_status()

# Serviço de Detecção (Abstração)
class DetectionService:
    def __init__(self):
        self.model = self._load_model()
    
    def detect_objects(self, frame):
        """Método abstrato para detecção"""
        pass
    
    def _load_model(self):
        """Método privado para carregamento do modelo"""
        pass

# Tipos de Eventos (Polimorfismo)
class EventType(Enum):
    INTRUSION = "intrusion"
    MOVEMENT = "movement"
    ALERT = "alert"

# Herança de Eventos
class BaseEvent:
    def __init__(self, camera_id, timestamp):
        self.camera_id = camera_id
        self.timestamp = timestamp
    
    def process(self):
        raise NotImplementedError

class IntrusionEvent(BaseEvent):
    def process(self):
        # Lógica específica para invasões
        pass
```

### 2.3 Requisito 3: Arquitetura de Microsserviços
**Descrição:** O sistema é dividido em microsserviços independentes, cada um responsável por uma funcionalidade específica.

**Aplicação no Projeto:**

#### Estrutura de Microsserviços:
```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│                 Interface de Usuário                        │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP/WebSocket
┌──────────────────▼──────────────────────────────────────────┐
│              API GATEWAY (FastAPI)                          │
│            Roteamento e Autenticação                        │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│              MICROSSERVIÇOS BACKEND                         │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Auth Service  │ Camera Service  │ Detection Service       │
│   - Login/Logout│ - CRUD Câmeras  │ - IA & Detecção        │
│   - JWT Tokens  │ - Streams       │ - Análise de Vídeo     │
├─────────────────┼─────────────────┼─────────────────────────┤
│  Event Service  │ Notification    │ File Service           │
│  - Histórico    │ Service         │ - Upload/Download      │
│  - Relatórios   │ - WebSocket     │ - Screenshots/Vídeos   │
└─────────────────┴─────────────────┴─────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│               BANCO DE DADOS (MySQL)                        │
│         Persistência de Dados e Relacionamentos            │
└─────────────────────────────────────────────────────────────┘
```

#### Benefícios da Arquitetura:
- **Escalabilidade:** Cada serviço pode ser escalado independentemente
- **Manutenibilidade:** Mudanças em um serviço não afetam outros
- **Tecnologia:** Cada serviço pode usar tecnologias específicas
- **Deploy:** Deploy independente de cada microsserviço

### 2.4 Requisito 4: Bibliotecas Python
**Descrição:** Utilização de bibliotecas especializadas para diferentes funcionalidades do sistema.

**Bibliotecas Utilizadas:**

#### Desenvolvimento Web:
```python
# requirements.txt
fastapi==0.104.1              # Framework web moderno
uvicorn[standard]==0.24.0     # Servidor ASGI
python-multipart==0.0.6       # Upload de arquivos
python-jose[cryptography]==3.3.0  # JWT tokens
passlib[bcrypt]==1.7.4        # Hash de senhas
```

#### Banco de Dados:
```python
sqlalchemy==2.0.23            # ORM para banco de dados
pymysql==1.1.0                # Driver MySQL
cryptography==41.0.7          # Criptografia
```

#### Inteligência Artificial:
```python
opencv-python==4.8.1.78       # Processamento de vídeo
tensorflow==2.15.0            # Framework de IA
numpy==1.24.3                 # Computação numérica
pillow==10.1.0                # Processamento de imagens
ultralytics==8.0.196          # YOLO v8
```

#### WebSocket e Utilitários:
```python
websockets==12.0              # Comunicação em tempo real
aiofiles==23.2.1              # Operações assíncronas de arquivo
pydantic==2.5.0               # Validação de dados
httpx==0.25.2                 # Cliente HTTP assíncrono
```

### 2.5 Requisito 5: Garantia de Qualidade através de Testes
**Descrição:** Implementação de uma suíte completa de testes para garantir a qualidade e confiabilidade do software.

#### 5.1 Testes Unitários
**Objetivo:** Validar individualmente cada componente do código.

**Exemplos de Implementação:**
```python
# tests/unit/test_detection_service.py
import pytest
from services.detection_service import DetectionService
from models.camera import Camera

class TestDetectionService:
    def setup_method(self):
        self.detection_service = DetectionService()
        self.mock_camera = Camera(
            id=1,
            name="Test Camera",
            stream_url="rtsp://test.com/stream"
        )
    
    def test_detect_objects_valid_frame(self):
        """Teste de detecção com frame válido"""
        import numpy as np
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        result = self.detection_service.detect_objects(frame, 1)
        assert result is not None
    
    def test_check_intrusion_line_crossing(self):
        """Teste de verificação de cruzamento de linha"""
        detection_line = {
            'start_x': 100, 'start_y': 100,
            'end_x': 200, 'end_y': 200
        }
        center_point = [150, 150]
        result = self.detection_service._point_crossed_line(
            center_point, detection_line
        )
        assert result is True
    
    def test_save_screenshot(self):
        """Teste de salvamento de screenshot"""
        import numpy as np
        frame = np.ones((480, 640, 3), dtype=np.uint8) * 255
        timestamp = 1640995200.0
        result = self.detection_service._save_screenshot(frame, 1, timestamp)
        assert result != ""
        assert os.path.exists(result)

# tests/unit/test_camera_service.py
class TestCameraService:
    def test_create_camera(self):
        """Teste de criação de câmera"""
        camera_data = {
            'name': 'Test Camera',
            'location': 'Test Location',
            'stream_url': 'rtsp://test.com/stream'
        }
        result = camera_service.create_camera(camera_data)
        assert result.name == 'Test Camera'
        assert result.location == 'Test Location'
    
    def test_get_camera_by_id(self):
        """Teste de busca de câmera por ID"""
        camera = camera_service.get_camera(1)
        assert camera is not None
        assert camera.id == 1
```

#### 5.2 Testes de Integração
**Objetivo:** Verificar comunicação entre diferentes módulos e serviços.

**Exemplos de Implementação:**
```python
# tests/integration/test_camera_detection_integration.py
import pytest
from fastapi.testclient import TestClient
from main import app
from database import get_db
from models.camera import Camera
from models.event import Event

class TestCameraDetectionIntegration:
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    @pytest.fixture
    def test_camera(self):
        camera = Camera(
            name="Integration Test Camera",
            stream_url="rtsp://test.com/stream",
            location="Test Location"
        )
        return camera
    
    def test_camera_creation_and_detection_start(self, client, test_camera):
        """Teste de criação de câmera e início de detecção"""
        # Criar câmera
        response = client.post("/api/v1/cameras/", json={
            "name": test_camera.name,
            "location": test_camera.location,
            "stream_url": test_camera.stream_url
        })
        assert response.status_code == 201
        camera_id = response.json()["id"]
        
        # Iniciar detecção
        response = client.post(f"/api/v1/cameras/{camera_id}/start-detection")
        assert response.status_code == 200
        
        # Verificar se eventos são criados
        response = client.get("/api/v1/events/")
        assert response.status_code == 200
        events = response.json()
        assert len(events) >= 0  # Pode não ter eventos ainda
    
    def test_event_creation_after_detection(self, client):
        """Teste de criação de evento após detecção"""
        # Simular detecção de invasão
        response = client.post("/api/v1/events/", json={
            "camera_id": 1,
            "event_type": "intrusion",
            "description": "Test intrusion detection"
        })
        assert response.status_code == 201
        
        # Verificar se evento foi criado
        event_id = response.json()["id"]
        response = client.get(f"/api/v1/events/{event_id}")
        assert response.status_code == 200
        assert response.json()["event_type"] == "intrusion"
```

#### 5.3 Testes de Sistema
**Objetivo:** Avaliar o sistema completo verificando requisitos funcionais e não-funcionais.

**Exemplos de Implementação:**
```python
# tests/system/test_complete_system.py
import pytest
import time
from fastapi.testclient import TestClient
from main import app

class TestCompleteSystem:
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    def test_complete_detection_workflow(self, client):
        """Teste do fluxo completo de detecção"""
        # 1. Autenticação
        auth_response = client.post("/api/v1/auth/login", data={
            "username": "admin@test.com",
            "password": "admin123"
        })
        assert auth_response.status_code == 200
        token = auth_response.json()["access_token"]
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Criar câmera
        camera_response = client.post("/api/v1/cameras/", 
            json={
                "name": "System Test Camera",
                "stream_url": "rtsp://test.com/stream",
                "location": "System Test Location"
            },
            headers=headers
        )
        assert camera_response.status_code == 201
        camera_id = camera_response.json()["id"]
        
        # 3. Configurar linha de detecção
        line_config = {
            "start_x": 100, "start_y": 100,
            "end_x": 200, "end_y": 200
        }
        config_response = client.post(
            f"/api/v1/cameras/{camera_id}/configure-line",
            json=line_config,
            headers=headers
        )
        assert config_response.status_code == 200
        
        # 4. Iniciar monitoramento
        monitor_response = client.post(
            f"/api/v1/cameras/{camera_id}/start-monitoring",
            headers=headers
        )
        assert monitor_response.status_code == 200
        
        # 5. Verificar dashboard
        dashboard_response = client.get("/api/v1/dashboard/stats", headers=headers)
        assert dashboard_response.status_code == 200
        stats = dashboard_response.json()
        assert stats["total_cameras"] >= 1
        
        # 6. Verificar eventos
        events_response = client.get("/api/v1/events/", headers=headers)
        assert events_response.status_code == 200
    
    def test_system_performance_requirements(self, client):
        """Teste de requisitos de performance"""
        import time
        
        # Teste de tempo de resposta da API
        start_time = time.time()
        response = client.get("/api/v1/cameras/")
        end_time = time.time()
        
        response_time = end_time - start_time
        assert response_time < 1.0  # Deve responder em menos de 1 segundo
        assert response.status_code == 200
    
    def test_system_reliability(self, client):
        """Teste de confiabilidade do sistema"""
        # Teste de múltiplas requisições simultâneas
        import concurrent.futures
        
        def make_request():
            return client.get("/api/v1/cameras/")
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            results = [future.result() for future in futures]
        
        # Todas as requisições devem ser bem-sucedidas
        for result in results:
            assert result.status_code == 200
```

#### 5.4 Testes de Carga
**Objetivo:** Análise de desempenho sob diferentes níveis de carga.

**Exemplos de Implementação:**
```python
# tests/load/test_load_performance.py
import pytest
import asyncio
import aiohttp
import time
from concurrent.futures import ThreadPoolExecutor

class TestLoadPerformance:
    BASE_URL = "http://localhost:8000"
    
    async def make_async_request(self, session, endpoint):
        """Fazer requisição assíncrona"""
        async with session.get(f"{self.BASE_URL}{endpoint}") as response:
            return await response.json()
    
    def test_concurrent_camera_requests(self):
        """Teste de requisições concorrentes para câmeras"""
        import requests
        
        def make_request():
            response = requests.get(f"{self.BASE_URL}/api/v1/cameras/")
            return response.status_code, response.elapsed.total_seconds()
        
        # Executar 50 requisições simultâneas
        with ThreadPoolExecutor(max_workers=50) as executor:
            start_time = time.time()
            futures = [executor.submit(make_request) for _ in range(50)]
            results = [future.result() for future in futures]
            end_time = time.time()
        
        total_time = end_time - start_time
        
        # Verificar resultados
        success_count = sum(1 for status, _ in results if status == 200)
        avg_response_time = sum(time for _, time in results) / len(results)
        
        assert success_count >= 45  # Pelo menos 90% de sucesso
        assert avg_response_time < 2.0  # Tempo médio menor que 2 segundos
        assert total_time < 10.0  # Total menor que 10 segundos
    
    def test_database_load_performance(self):
        """Teste de performance do banco de dados"""
        import requests
        
        # Teste de criação múltipla de eventos
        def create_event():
            event_data = {
                "camera_id": 1,
                "event_type": "intrusion",
                "description": f"Load test event {time.time()}"
            }
            response = requests.post(
                f"{self.BASE_URL}/api/v1/events/",
                json=event_data
            )
            return response.status_code, response.elapsed.total_seconds()
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(create_event) for _ in range(100)]
            results = [future.result() for future in futures]
        
        end_time = time.time()
        
        success_count = sum(1 for status, _ in results if status == 201)
        avg_time = sum(time for _, time in results) / len(results)
        
        assert success_count >= 90  # Pelo menos 90% de sucesso
        assert avg_time < 1.0  # Tempo médio menor que 1 segundo
        assert (end_time - start_time) < 15.0  # Total menor que 15 segundos
    
    def test_detection_service_load(self):
        """Teste de carga do serviço de detecção"""
        from services.detection_service import DetectionService
        import numpy as np
        
        detection_service = DetectionService()
        
        # Criar múltiplos frames de teste
        frames = [np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8) 
                 for _ in range(100)]
        
        start_time = time.time()
        
        # Processar frames em paralelo
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(detection_service.detect_objects, frame, 1) 
                      for frame in frames]
            results = [future.result() for future in futures]
        
        end_time = time.time()
        
        processing_time = end_time - start_time
        fps = len(frames) / processing_time
        
        # Verificar performance
        assert fps >= 5.0  # Pelo menos 5 FPS
        assert processing_time < 20.0  # Processamento em menos de 20 segundos
        assert all(result is not None for result in results)  # Todos processados
```

### 2.6 Requisito 6: Versionamento de Código
**Descrição:** Controle de versão usando Git para gerenciar mudanças no código e colaboração da equipe.

**Estrutura do Repositório:**
```
smart-perimeter-guard/
├── .git/                     # Controle de versão Git
├── .gitignore               # Arquivos ignorados
├── README.md                # Documentação principal
├── ARCHITECTURE.md          # Documentação da arquitetura
├── requirements.txt         # Dependências Python
├── frontend/                # Código do frontend
│   ├── package.json
│   ├── src/
│   └── public/
├── backend/                 # Código do backend
│   ├── main.py
│   ├── services/
│   ├── models/
│   ├── api/
│   └── tests/
├── docs/                    # Documentação adicional
│   ├── api/
│   ├── deployment/
│   └── user-guide/
└── scripts/                 # Scripts de automação
    ├── setup.sh
    ├── test.sh
    └── deploy.sh
```

**Estratégia de Branches:**
```
main (produção)
├── develop (desenvolvimento)
├── feature/camera-management
├── feature/detection-service
├── feature/authentication
├── feature/frontend-dashboard
├── hotfix/security-patch
└── release/v1.0.0
```

**Convenções de Commit:**
```
feat: adicionar funcionalidade de detecção de objetos
fix: corrigir erro de autenticação JWT
docs: atualizar documentação da API
test: adicionar testes unitários para camera service
refactor: reorganizar estrutura de serviços
perf: otimizar performance da detecção
```

---

## 📅 3. CRONOGRAMA INTERNO DA EQUIPE

### 3.1 Fases do Projeto

#### **Fase 1: Planejamento e Configuração (Semana 1-2)**
- [ ] **Semana 1:**
  - Definição da arquitetura detalhada
  - Configuração do ambiente de desenvolvimento
  - Setup do repositório Git
  - Criação da documentação inicial
  
- [ ] **Semana 2:**
  - Configuração do banco de dados
  - Setup dos microsserviços básicos
  - Configuração do frontend React
  - Implementação da autenticação básica

#### **Fase 2: Desenvolvimento Core (Semana 3-6)**
- [ ] **Semana 3:**
  - Implementação do serviço de câmeras
  - Desenvolvimento da API REST
  - Integração com banco de dados
  - Testes unitários básicos

- [ ] **Semana 4:**
  - Implementação do módulo de IA
  - Integração YOLO v8 + OpenCV
  - Serviço de detecção de objetos
  - Testes de integração

- [ ] **Semana 5:**
  - Desenvolvimento do frontend
  - Dashboard de monitoramento
  - Interface de gerenciamento de câmeras
  - Testes de interface

- [ ] **Semana 6:**
  - Sistema de eventos e notificações
  - WebSocket para tempo real
  - Histórico e relatórios
  - Testes de sistema

#### **Fase 3: Testes e Qualidade (Semana 7-8)**
- [ ] **Semana 7:**
  - Implementação completa da suíte de testes
  - Testes de carga e performance
  - Correção de bugs identificados
  - Otimização de performance

- [ ] **Semana 8:**
  - Testes de aceitação
  - Documentação final
  - Preparação para apresentação
  - Deploy de demonstração

#### **Fase 4: Finalização (Semana 9)**
- [ ] **Semana 9:**
  - Apresentação final
  - Documentação completa
  - Entrega do projeto
  - Retrospectiva da equipe

### 3.2 Distribuição de Responsabilidades

| Integrante | Responsabilidades Principais |
|------------|------------------------------|
| **Integrante 1** | Backend Core, API REST, Banco de Dados |
| **Integrante 2** | Módulo de IA, Detecção de Objetos, OpenCV |
| **Integrante 3** | Frontend React, Interface, Dashboard |
| **Integrante 4** | Testes, Qualidade, DevOps, Deploy |

### 3.3 Marcos Importantes

| Data | Marco | Entregáveis |
|------|-------|-------------|
| **Semana 2** | Arquitetura Finalizada | Documentação técnica, Setup completo |
| **Semana 4** | Backend Funcional | APIs funcionais, IA integrada |
| **Semana 6** | MVP Completo | Sistema funcionando end-to-end |
| **Semana 8** | Qualidade Garantida | Testes completos, Performance validada |
| **Semana 9** | Projeto Finalizado | Apresentação, Documentação final |

---

## 🏗️ 4. DEFINIÇÃO DA ARQUITETURA INICIAL

### 4.1 Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                           │
│                 React + TypeScript                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │  Dashboard  │ │  Cameras    │ │   Events    │          │
│  │  Monitor    │ │ Management  │ │  History    │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP/HTTPS + WebSocket
┌──────────────────▼──────────────────────────────────────────┐
│                 API GATEWAY                                 │
│              FastAPI + CORS                                 │
│            Rate Limiting + Auth                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│              MICROSERVICES LAYER                            │
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │    Auth     │ │   Camera    │ │ Detection   │          │
│  │   Service   │ │   Service   │ │   Service   │          │
│  │ JWT + Users │ │ CRUD + RTSP │ │ AI + OpenCV │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │    Event    │ │Notification │ │    File     │          │
│  │   Service   │ │   Service   │ │   Service   │          │
│  │History+Logs │ │ WebSocket   │ │Screenshots  │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│               DATA LAYER                                    │
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │   MySQL     │ │    Redis    │ │File Storage │          │
│  │  Database   │ │    Cache    │ │   System    │          │
│  │ Users+Events│ │ Sessions    │ │Screenshots  │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Detalhamento dos Componentes

#### **4.2.1 Frontend Layer**
- **Tecnologia:** React 18 + TypeScript + Vite
- **UI Framework:** Tailwind CSS + shadcn/ui
- **Estado:** TanStack Query + Context API
- **Roteamento:** React Router v6
- **Comunicação:** Axios + WebSocket

#### **4.2.2 API Gateway**
- **Tecnologia:** FastAPI + Uvicorn
- **Funcionalidades:**
  - Roteamento de requisições
  - Autenticação JWT
  - Rate limiting
  - CORS configuration
  - Request/Response logging

#### **4.2.3 Microservices**

**Auth Service:**
```python
# Responsabilidades
- Autenticação de usuários
- Geração e validação de JWT
- Gerenciamento de sessões
- Controle de acesso baseado em roles

# Endpoints
POST /auth/login
POST /auth/register
GET /auth/me
POST /auth/refresh
POST /auth/logout
```

**Camera Service:**
```python
# Responsabilidades
- CRUD de câmeras
- Gerenciamento de streams RTSP
- Configuração de zonas de detecção
- Status de câmeras

# Endpoints
GET /cameras/
POST /cameras/
PUT /cameras/{id}
DELETE /cameras/{id}
POST /cameras/{id}/configure-zone
POST /cameras/{id}/start-monitoring
```

**Detection Service:**
```python
# Responsabilidades
- Processamento de vídeo em tempo real
- Detecção de objetos com YOLO
- Análise de movimento
- Geração de alertas

# Funcionalidades
- Carregamento de modelo YOLO v8
- Processamento de frames
- Detecção de cruzamento de linhas
- Criação de eventos
```

**Event Service:**
```python
# Responsabilidades
- Armazenamento de eventos
- Histórico de detecções
- Relatórios e estatísticas
- Exportação de dados

# Endpoints
GET /events/
GET /events/{id}
GET /events/stats
GET /events/export
POST /events/{id}/mark-notified
```

**Notification Service:**
```python
# Responsabilidades
- Notificações em tempo real via WebSocket
- Alertas de invasão
- Status de sistema
- Comunicação com frontend

# Funcionalidades
- WebSocket server
- Broadcasting de alertas
- Gerenciamento de conexões
- Rate limiting de notificações
```

**File Service:**
```python
# Responsabilidades
- Upload e download de arquivos
- Armazenamento de screenshots
- Gerenciamento de vídeos
- Otimização de storage

# Endpoints
GET /files/{filename}
POST /files/upload
DELETE /files/{filename}
GET /files/screenshots/{camera_id}
```

#### **4.2.4 Data Layer**

**MySQL Database:**
```sql
-- Tabelas principais
users (id, email, password_hash, role, created_at)
cameras (id, name, location, stream_url, status, detection_config)
events (id, camera_id, event_type, timestamp, metadata, files)
detection_configs (id, camera_id, line_config, zone_config, sensitivity)
```

**Redis Cache:**
```python
# Uso do Redis
- Cache de sessões de usuário
- Cache de dados de câmeras
- Cache de estatísticas
- Rate limiting
- Pub/Sub para notificações
```

**File Storage:**
```python
# Estrutura de arquivos
uploads/
├── screenshots/
│   ├── camera_1/
│   └── camera_2/
├── videos/
│   ├── camera_1/
│   └── camera_2/
└── exports/
    ├── reports/
    └── backups/
```

### 4.3 Fluxo de Dados

#### **4.3.1 Fluxo de Detecção de Invasão**
```
1. Câmera IP → Stream RTSP
2. Detection Service → Captura frames
3. YOLO v8 → Detecta objetos
4. Análise → Verifica cruzamento de linha/zona
5. Se invasão detectada:
   - Salva screenshot
   - Cria evento no banco
   - Envia notificação WebSocket
6. Frontend → Recebe notificação
   - Atualiza dashboard
   - Exibe alerta visual
   - Reproduz som de alerta
```

#### **4.3.2 Fluxo de Autenticação**
```
1. Usuário → Login no frontend
2. Frontend → POST /auth/login
3. Auth Service → Valida credenciais
4. Auth Service → Gera JWT token
5. Frontend → Armazena token
6. Frontend → Inclui token em requisições
7. API Gateway → Valida token
8. API Gateway → Roteia para microsserviço
```

### 4.4 Tecnologias e Ferramentas

#### **Desenvolvimento:**
- **Backend:** Python 3.10+, FastAPI, SQLAlchemy
- **Frontend:** React 18, TypeScript, Tailwind CSS
- **IA:** OpenCV, YOLO v8, TensorFlow
- **Banco:** MySQL 8.0, Redis 7.0

#### **Testes:**
- **Unitários:** pytest, unittest
- **Integração:** pytest, FastAPI TestClient
- **E2E:** Playwright, Cypress
- **Carga:** Locust, Apache Bench

#### **DevOps:**
- **Containerização:** Docker, Docker Compose
- **CI/CD:** GitHub Actions
- **Monitoramento:** Prometheus, Grafana
- **Logs:** ELK Stack

#### **Qualidade:**
- **Linting:** Black, Flake8, ESLint
- **Type Checking:** mypy, TypeScript
- **Coverage:** Coverage.py, Jest
- **Security:** Bandit, npm audit

---

## 📊 5. MÉTRICAS DE SUCESSO

### 5.1 Métricas Técnicas
- **Cobertura de Testes:** ≥ 90%
- **Tempo de Resposta da API:** < 200ms
- **Disponibilidade:** ≥ 99.5%
- **Throughput:** ≥ 100 requisições/segundo
- **Precisão da Detecção:** ≥ 95%

### 5.2 Métricas de Qualidade
- **Bugs Críticos:** 0
- **Bugs por Funcionalidade:** < 2
- **Tempo de Deploy:** < 5 minutos
- **Tempo de Recuperação:** < 30 segundos
- **Compliance com Arquitetura:** 100%

---

## 📚 6. REFERÊNCIAS

1. **FastAPI Documentation:** https://fastapi.tiangolo.com/
2. **React Documentation:** https://react.dev/
3. **YOLO v8 Documentation:** https://docs.ultralytics.com/
4. **OpenCV Python Tutorial:** https://docs.opencv.org/4.x/d6/d00/tutorial_py_root.html
5. **SQLAlchemy Documentation:** https://docs.sqlalchemy.org/
6. **Pytest Documentation:** https://docs.pytest.org/
7. **Docker Documentation:** https://docs.docker.com/
8. **Git Best Practices:** https://git-scm.com/doc

---

**Documento elaborado em:** [Data atual]  
**Versão:** 1.0  
**Status:** Em desenvolvimento  
**Próxima revisão:** [Data da próxima revisão]
