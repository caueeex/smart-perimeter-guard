# SecureVision Backend

Backend Python para o sistema de monitoramento inteligente por câmeras.

## 🚀 Tecnologias

- **FastAPI** - Framework web moderno e rápido
- **SQLAlchemy** - ORM para banco de dados
- **MySQL** - Banco de dados (via phpMyAdmin)
- **OpenCV** - Processamento de vídeo
- **YOLO v8** - Detecção de objetos
- **WebSocket** - Notificações em tempo real
- **JWT** - Autenticação

## 📋 Pré-requisitos

- Python 3.10+
- MySQL Server
- phpMyAdmin (opcional, para gerenciamento)

## 🛠️ Instalação

1. **Clone o repositório**
```bash
git clone <repository-url>
cd smart-perimeter-guard/backend
```

2. **Instale as dependências**
```bash
pip install -r requirements.txt
```

3. **Configure o banco de dados**
   - Crie um banco MySQL chamado `securevision`
   - Configure as credenciais no arquivo `config.py`

4. **Execute os scripts de inicialização**
```bash
# Criar banco e tabelas
python scripts/create_database.py

# Baixar modelo YOLO
python scripts/download_model.py
```

## 🚀 Execução

### API Principal
```bash
python main.py
```
A API estará disponível em: http://localhost:8000

### Servidor WebSocket
```bash
python websocket_server.py
```
O WebSocket estará disponível em: ws://localhost:8001

## 📚 Documentação da API

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do backend:

```env
# Banco de Dados
DATABASE_URL=mysql+pymysql://root:password@localhost:3306/securevision
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=securevision

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

## 📊 Endpoints Principais

### Autenticação
- `POST /api/v1/auth/register` - Registrar usuário
- `POST /api/v1/auth/login` - Fazer login
- `GET /api/v1/auth/me` - Obter dados do usuário

### Câmeras
- `GET /api/v1/cameras/` - Listar câmeras
- `POST /api/v1/cameras/` - Criar câmera
- `PUT /api/v1/cameras/{id}` - Atualizar câmera
- `DELETE /api/v1/cameras/{id}` - Deletar câmera
- `POST /api/v1/cameras/{id}/configure-line` - Configurar linha de detecção

### Eventos
- `GET /api/v1/events/` - Listar eventos
- `GET /api/v1/events/{id}` - Obter evento
- `GET /api/v1/events/stats/summary` - Estatísticas
- `GET /api/v1/events/heatmap/{camera_id}` - Dados do heatmap

## 🤖 Módulo de IA

### Detecção de Objetos
- Utiliza YOLO v8 para detecção em tempo real
- Suporta: pessoas, carros, caminhões, motos, bicicletas
- Configurável: threshold de confiança, FPS, resolução

### Linha de Detecção
- Linha virtual configurável pelo usuário
- Detecção de cruzamento em tempo real
- Tolerância configurável

### Zona de Detecção
- Polígono configurável
- Detecção de entrada/saída
- Algoritmo ray casting

### Heatmap
- Mapa de calor das áreas mais movimentadas
- Resolução configurável (padrão: 32x32)
- Análise temporal

## 🔔 Notificações WebSocket

### Tipos de Mensagem
- `intrusion_alert` - Alerta de invasão
- `system_notification` - Notificação do sistema
- `connection` - Confirmação de conexão
- `pong` - Resposta ao ping

### Exemplo de Uso
```javascript
const ws = new WebSocket('ws://localhost:8001');

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'intrusion_alert') {
        console.log('Invasão detectada:', data);
        // Mostrar alerta na interface
    }
};
```

## 📁 Estrutura do Projeto

```
backend/
├── api/                    # Endpoints da API
│   └── v1/
│       ├── auth.py        # Autenticação
│       ├── cameras.py     # Câmeras
│       └── events.py      # Eventos
├── models/                # Modelos do banco
│   ├── user.py
│   ├── camera.py
│   └── event.py
├── schemas/               # Schemas Pydantic
│   ├── user.py
│   ├── camera.py
│   └── event.py
├── services/              # Lógica de negócio
│   ├── auth_service.py
│   ├── camera_service.py
│   ├── detection_service.py
│   └── event_service.py
├── ai/                    # Módulo de IA
│   └── heatmap_generator.py
├── scripts/               # Scripts utilitários
│   ├── create_database.py
│   └── download_model.py
├── config.py              # Configurações
├── database.py            # Configuração do banco
├── main.py                # Aplicação principal
└── websocket_server.py    # Servidor WebSocket
```

## 🧪 Testes

```bash
# Executar testes
pytest

# Com cobertura
pytest --cov=.
```

## 📝 Logs

Os logs são salvos em:
- `./logs/` - Logs da aplicação
- Console - Logs em tempo real

## 🔒 Segurança

- Senhas criptografadas com bcrypt
- Tokens JWT com expiração
- Validação de entrada com Pydantic
- CORS configurado
- Rate limiting (implementar)

## 🚀 Deploy

### Desenvolvimento
```bash
python main.py
```

### Produção
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs
2. Consulte a documentação da API
3. Abra uma issue no repositório

## 📄 Licença

Este projeto é parte de um projeto acadêmico integrador.

