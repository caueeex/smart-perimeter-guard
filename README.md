# 🛡️ SecureVision - Sistema Inteligente de Monitoramento por Câmeras

Sistema de vigilância com Inteligência Artificial para detecção automática de invasões através de câmeras IP.

**Projeto Integrador Acadêmico** - Integração de Front-end, Back-end Python, Inteligência Artificial e Engenharia de Software.

---

## 📋 Sobre o Projeto

O **SecureVision (Smart Perimeter Guard)** é um sistema completo de monitoramento inteligente que utiliza visão computacional e IA para detectar automaticamente invasões e movimentos suspeitos em tempo real.

### 🎯 Funcionalidades Principais

- ✅ **Detecção Inteligente de Invasões** - IA com YOLO v8 para detecção de objetos
- ✅ **Monitoramento em Tempo Real** - Stream de câmeras IP (RTSP/HTTP)
- ✅ **Linhas de Detecção Personalizáveis** - Desenhe áreas de segurança
- ✅ **Notificações Instantâneas** - WebSocket para alertas em tempo real
- ✅ **Histórico de Eventos** - Timeline completa com imagens e vídeos
- ✅ **Dashboard Inteligente** - Estatísticas e métricas em tempo real
- ✅ **Mapa de Calor** - Análise de áreas mais movimentadas
- ✅ **Interface Responsiva** - Design moderno e intuitivo

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────┐
│                   FRONT-END                             │
│              React + TypeScript + Vite                  │
│     Dashboard | Câmeras | Eventos | Notificações       │
└──────────────────┬──────────────────────────────────────┘
                   │ REST API / WebSocket
┌──────────────────▼──────────────────────────────────────┐
│                   BACK-END                              │
│              FastAPI + Python 3.10+                     │
│   Auth | Camera Service | Detection | Events           │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│                 MÓDULO DE IA                            │
│          OpenCV + YOLO v8 + TensorFlow                  │
│   Detecção | Classificação | Tracking | Heatmap        │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│              BANCO DE DADOS                             │
│                MySQL / SQLite                           │
│      Users | Cameras | Events | Storage                │
└─────────────────────────────────────────────────────────┘
```

### 📦 Tecnologias

#### Front-end
- **React 18** + TypeScript
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - Componentes
- **TanStack Query** - State management
- **React Router** - Navegação

#### Back-end
- **Python 3.10+**
- **FastAPI** - Framework web
- **SQLAlchemy** - ORM
- **MySQL/SQLite** - Banco de dados
- **JWT** - Autenticação
- **WebSocket** - Real-time

#### Inteligência Artificial
- **OpenCV** - Processamento de vídeo
- **YOLO v8** - Detecção de objetos
- **NumPy** - Computação numérica
- **Pillow** - Processamento de imagens

---

## 🚀 Instalação e Configuração

### Pré-requisitos

- **Python 3.10+** → [Download](https://www.python.org/downloads/)
- **Node.js 18+** → [Download](https://nodejs.org/)
- **MySQL 8.0+** (opcional - pode usar SQLite)

### Passo 1: Backend

```powershell
# Navegar para o backend
cd backend

# Ativar ambiente virtual
.\venv\Scripts\Activate

# Instalar dependências
pip install -r requirements.txt
pip install pymysql

# Criar banco de dados
python scripts/create_database_simple.py

# Criar usuário admin
python scripts/create_test_user.py

# Iniciar servidor (porta 8000)
python main.py
```

**✅ Backend rodando em:** http://localhost:8000  
**📚 Documentação da API:** http://localhost:8000/docs

### Passo 2: Frontend

Abra **outro terminal**:

```powershell
# Voltar para raiz do projeto
cd ..

# Instalar dependências
npm install

# Iniciar servidor (porta 5173)
npm run dev
```

**✅ Frontend rodando em:** http://localhost:5173

### Passo 3: Acessar o Sistema

1. Abra: **http://localhost:5173**
2. Login padrão:
   - **Email:** `admin@securevision.com`
   - **Senha:** `admin123`

---

## 📖 Como Usar

### 1. Adicionar Câmera

1. Acesse **Câmeras** no menu lateral
2. Clique em **"Nova Câmera"**
3. Preencha os dados:
   - Nome, localização, URL do stream
   - Para webcam, use a interface de seleção
4. Salve

### 2. Configurar Linha de Detecção

1. Clique em **"Configurar"** na câmera
2. Desenhe a linha de detecção no vídeo
3. Ajuste a sensibilidade
4. Salve as configurações

### 3. Monitorar Detecções

- O **Dashboard** mostra estatísticas em tempo real
- **Eventos** lista todas as detecções
- **Notificações** aparecem instantaneamente
- Visualize imagens e vídeos capturados

---

## 📁 Estrutura do Projeto

```
smart-perimeter-guard/
├── backend/                    # Backend Python
│   ├── api/v1/                # Endpoints da API
│   │   ├── auth.py           # Autenticação
│   │   ├── cameras.py        # Gerenciamento de câmeras
│   │   ├── events.py         # Eventos e histórico
│   │   ├── detection.py      # Detecção e IA
│   │   └── stream.py         # Streaming de vídeo
│   ├── models/               # Modelos do banco
│   │   ├── user.py
│   │   ├── camera.py
│   │   └── event.py
│   ├── services/             # Lógica de negócio
│   │   ├── auth_service.py
│   │   ├── camera_service.py
│   │   ├── detection_service.py
│   │   └── event_service.py
│   ├── ai/                   # Módulo de IA
│   │   └── heatmap_generator.py
│   ├── scripts/              # Scripts utilitários
│   ├── config.py             # Configurações
│   ├── database.py           # Banco de dados
│   ├── main.py               # App principal
│   └── requirements.txt      # Dependências Python
├── src/                       # Frontend React
│   ├── components/           # Componentes React
│   │   ├── ui/              # Componentes UI (shadcn)
│   │   ├── CameraConfig.tsx
│   │   ├── DetectionMonitor.tsx
│   │   ├── LiveStream.tsx
│   │   └── WebcamSelector.tsx
│   ├── pages/               # Páginas
│   │   ├── Dashboard.tsx
│   │   ├── Cameras.tsx
│   │   ├── Events.tsx
│   │   └── Login.tsx
│   ├── services/            # Serviços de API
│   │   ├── api.ts
│   │   └── websocket.ts
│   └── hooks/               # React hooks
├── public/                   # Arquivos estáticos
├── package.json             # Dependências Node
└── README.md                # Este arquivo
```

---

## 🔧 Configuração Avançada

### Variáveis de Ambiente

#### Backend (.env)
```env
# Banco de Dados
DATABASE_URL=mysql+pymysql://root:@localhost:3306/securevision
# ou para SQLite:
# DATABASE_URL=sqlite:///./securevision.db

# Segurança
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# IA
MODEL_PATH=./models/yolov8n.pt
CONFIDENCE_THRESHOLD=0.5
IOU_THRESHOLD=0.45

# WebSocket
WS_PORT=8001
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8001
```

### Usar SQLite (mais simples)

Para não precisar instalar MySQL, edite `backend/config.py`:

```python
# Linha 14-18, altere para:
database_url: str = Field(
    default="sqlite:///./securevision.db",
    env="DATABASE_URL"
)
```

### Câmeras IP RTSP

Formato da URL:
```
rtsp://usuario:senha@ip:porta/stream
```

Exemplos:
- `rtsp://admin:12345@192.168.1.100:554/stream1`
- `http://192.168.1.100:8080/video`

---

## 🔍 API Endpoints

### Autenticação
- `POST /api/v1/auth/register` - Registrar usuário
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Dados do usuário

### Câmeras
- `GET /api/v1/cameras/` - Listar câmeras
- `POST /api/v1/cameras/` - Criar câmera
- `PUT /api/v1/cameras/{id}` - Atualizar câmera
- `DELETE /api/v1/cameras/{id}` - Deletar câmera
- `POST /api/v1/cameras/{id}/start-monitoring` - Iniciar monitoramento
- `POST /api/v1/cameras/{id}/stop-monitoring` - Parar monitoramento

### Eventos
- `GET /api/v1/events/` - Listar eventos
- `GET /api/v1/events/{id}` - Obter evento específico
- `GET /api/v1/events/stats/summary` - Estatísticas
- `GET /api/v1/events/heatmap/{camera_id}` - Mapa de calor

### Detecção
- `POST /api/v1/detection/start/{camera_id}` - Iniciar detecção
- `POST /api/v1/detection/stop/{camera_id}` - Parar detecção
- `GET /api/v1/detection/status/{camera_id}` - Status da detecção

### Streaming
- `GET /api/v1/stream/{camera_id}` - Stream MJPEG
- `GET /api/v1/webcam/list` - Listar webcams disponíveis

**📚 Documentação completa:** http://localhost:8000/docs

---

## 🐛 Solução de Problemas

### Backend não inicia

```powershell
# Verificar se Python está instalado
python --version

# Ativar ambiente virtual
cd backend
.\venv\Scripts\Activate

# Reinstalar dependências
pip install -r requirements.txt

# Verificar banco de dados
python scripts/create_database_simple.py
```

### Frontend não inicia

```powershell
# Limpar cache e reinstalar
rm -rf node_modules
rm package-lock.json
npm install

# Iniciar em modo dev
npm run dev
```

### Erro de porta em uso

```powershell
# Windows - matar processo na porta 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Porta 5173 (frontend)
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### Erro de conexão com MySQL

**Opção 1:** Instalar MySQL
- Download: https://dev.mysql.com/downloads/mysql/

**Opção 2:** Usar SQLite (recomendado para testes)
- Edite `backend/config.py` linha 17:
  ```python
  default="sqlite:///./securevision.db"
  ```

### Webcam não detectada

```powershell
# Testar webcam
cd backend
python scripts/test_webcam.py

# Verificar permissões do navegador
# Chrome: chrome://settings/content/camera
```

### IA não detecta objetos

```powershell
# Baixar modelo YOLO novamente
cd backend
python scripts/download_model.py

# Verificar se arquivo existe
ls models/yolov8n.pt
```

---

## 📊 Requisitos do Sistema

### Mínimo
- **CPU:** 4 cores
- **RAM:** 8GB
- **Armazenamento:** 10GB livres
- **SO:** Windows 10+, Linux, macOS

### Recomendado
- **CPU:** 6+ cores
- **RAM:** 16GB
- **GPU:** NVIDIA com CUDA (para IA acelerada)
- **Armazenamento:** 20GB+ SSD

---

## 🧪 Testes

### Backend
```powershell
cd backend
pytest
pytest --cov=.  # Com cobertura
```

### Frontend
```powershell
npm test
npm run test:coverage
```

---

## 📝 Scripts Úteis

### Backend
```powershell
# Criar usuário admin
python scripts/create_test_user.py

# Resetar senha
python scripts/reset_user_password.py

# Verificar câmeras no banco
python scripts/check_cameras_db.py

# Testar detecção
python scripts/test_detection.py

# Testar webcam
python scripts/test_webcam.py
```

### Frontend
```powershell
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview

# Lint
npm run lint
```

---

## 🚀 Deploy em Produção

### Docker (Recomendado)

```dockerfile
# Criar Dockerfile e docker-compose.yml
docker-compose up -d
```

### Manual

#### Backend
```powershell
# Instalar dependências
pip install -r requirements.txt

# Usar servidor ASGI de produção
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

#### Frontend
```powershell
# Build
npm run build

# Servir com nginx ou outro servidor
```

---

## 📈 Roadmap

- ✅ Sistema de autenticação
- ✅ Gerenciamento de câmeras
- ✅ Detecção com IA (YOLO v8)
- ✅ Dashboard em tempo real
- ✅ Notificações WebSocket
- ✅ Histórico de eventos
- 🚧 Mapa de calor (heatmap)
- 🚧 Exportação de relatórios (PDF/CSV)
- 🚧 Notificações push (navegador)
- 🚧 Gravação contínua
- 🚧 Reconhecimento facial
- 📅 App mobile

---

## 👥 Equipe

**Projeto Integrador Acadêmico**

- Desenvolvimento Full-Stack
- Inteligência Artificial
- Engenharia de Software
- Arquitetura de Sistemas

---

## 📄 Licença

Este projeto é parte de um projeto acadêmico integrador.

---

## 🆘 Suporte

### Documentação
- **API:** http://localhost:8000/docs
- **Código:** Comentado e documentado

### Problemas
1. Verifique os logs no terminal
2. Consulte esta documentação
3. Verifique as issues do repositório

---

## 🎉 Começar Agora

```powershell
# 1. Backend
cd backend
.\venv\Scripts\Activate
python main.py

# 2. Frontend (outro terminal)
npm run dev

# 3. Acessar
# http://localhost:5173
# Login: admin@securevision.com / admin123
```

**Boa sorte! 🚀**
