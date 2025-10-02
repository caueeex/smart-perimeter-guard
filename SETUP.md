# 🚀 Guia de Configuração - SecureVision

Este guia irá ajudá-lo a configurar e executar o sistema SecureVision completo.

## 📋 Pré-requisitos

### Software Necessário
- **Python 3.10+** - Para o backend
- **Node.js 18+** - Para o frontend
- **MySQL 8.0+** - Banco de dados
- **phpMyAdmin** - Interface web para MySQL (opcional)

### Hardware Recomendado
- **CPU**: 4+ cores
- **RAM**: 8GB+ (16GB recomendado para IA)
- **GPU**: NVIDIA com CUDA (opcional, para aceleração de IA)
- **Armazenamento**: 10GB+ livres

## 🛠️ Instalação Passo a Passo

### 1. Configurar Banco de Dados MySQL

#### 1.1 Instalar MySQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server

# Windows
# Baixar do site oficial: https://dev.mysql.com/downloads/mysql/

# macOS
brew install mysql
```

#### 1.2 Configurar MySQL
```bash
# Iniciar MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Configurar segurança
sudo mysql_secure_installation
```

#### 1.3 Criar Banco de Dados
```sql
-- Conectar ao MySQL
mysql -u root -p

-- Criar banco de dados
CREATE DATABASE securevision CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Criar usuário (opcional)
CREATE USER 'securevision'@'localhost' IDENTIFIED BY 'sua_senha_aqui';
GRANT ALL PRIVILEGES ON securevision.* TO 'securevision'@'localhost';
FLUSH PRIVILEGES;

-- Sair
EXIT;
```

#### 1.4 Instalar phpMyAdmin (Opcional)
```bash
# Ubuntu/Debian
sudo apt install phpmyadmin

# Configurar no navegador: http://localhost/phpmyadmin
```

### 2. Configurar Backend Python

#### 2.1 Navegar para o diretório do backend
```bash
cd backend
```

#### 2.2 Criar ambiente virtual
```bash
# Criar ambiente virtual
python -m venv venv

# Ativar ambiente virtual
# Linux/macOS:
source venv/bin/activate
# Windows:
venv\Scripts\activate
```

#### 2.3 Instalar dependências
```bash
pip install -r requirements.txt
```

#### 2.4 Configurar variáveis de ambiente
```bash
# Copiar arquivo de exemplo
cp config.py config_local.py

# Editar configurações do banco
# Alterar DATABASE_URL com suas credenciais
```

#### 2.5 Executar scripts de inicialização
```bash
# Criar banco e tabelas
python scripts/create_database.py

# Baixar modelo YOLO
python scripts/download_model.py
```

#### 2.6 Iniciar servidor backend
```bash
# Terminal 1 - API Principal
python main.py

# Terminal 2 - WebSocket (opcional, em desenvolvimento)
python websocket_server.py
```

### 3. Configurar Frontend React

#### 3.1 Navegar para o diretório raiz
```bash
cd ..  # Voltar para o diretório raiz
```

#### 3.2 Instalar dependências
```bash
npm install
```

#### 3.3 Configurar variáveis de ambiente
```bash
# Criar arquivo .env
cp src/env.example .env

# Editar .env se necessário
# VITE_API_URL=http://localhost:8000/api/v1
# VITE_WS_URL=ws://localhost:8001
```

#### 3.4 Iniciar servidor de desenvolvimento
```bash
npm run dev
```

## 🎯 Verificação da Instalação

### 1. Verificar Backend
- **API**: http://localhost:8000
- **Documentação**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### 2. Verificar Frontend
- **Aplicação**: http://localhost:5173
- **Login**: admin@securevision.com / admin123

### 3. Verificar Banco de Dados
- **phpMyAdmin**: http://localhost/phpmyadmin
- **Banco**: securevision
- **Tabelas**: users, cameras, events

## 🔧 Configurações Avançadas

### 1. Configurar Câmeras IP

#### 1.1 Adicionar Câmera via Interface
1. Acesse http://localhost:5173
2. Faça login como admin
3. Vá para "Câmeras"
4. Clique em "Nova Câmera"
5. Preencha os dados:
   - **Nome**: Nome da câmera
   - **Localização**: Local físico
   - **URL do Stream**: rtsp://usuario:senha@ip:porta/stream
   - **Zona**: Identificação da área
   - **Detecção**: Habilitar/desabilitar

#### 1.2 Configurar Linha de Detecção
1. Clique em "Configurar" na câmera
2. Desenhe a linha na interface
3. Ajuste a sensibilidade
4. Salve as configurações

### 2. Configurar Notificações

#### 2.1 WebSocket
- Conecta automaticamente
- Notificações em tempo real
- Alertas sonoros

#### 2.2 Push Notifications (Futuro)
- Service Worker
- Firebase Cloud Messaging
- Notificações do navegador

### 3. Configurar IA

#### 3.1 Modelo YOLO
- Baixado automaticamente
- Localização: `backend/models/yolov8n.pt`
- Classes: pessoa, carro, caminhão, moto, bicicleta

#### 3.2 Parâmetros de Detecção
- **Confiança**: 0.5 (50%)
- **IoU**: 0.45
- **FPS**: 15
- **Resolução**: 640x480

## 🚨 Solução de Problemas

### 1. Erro de Conexão com Banco
```bash
# Verificar se MySQL está rodando
sudo systemctl status mysql

# Verificar credenciais no config.py
# Testar conexão
mysql -u root -p -e "USE securevision; SHOW TABLES;"
```

### 2. Erro de Dependências Python
```bash
# Atualizar pip
pip install --upgrade pip

# Reinstalar dependências
pip install -r requirements.txt --force-reinstall
```

### 3. Erro de Modelo YOLO
```bash
# Baixar modelo manualmente
cd backend
python scripts/download_model.py

# Verificar se arquivo existe
ls -la models/yolov8n.pt
```

### 4. Erro de CORS
```bash
# Verificar se backend está rodando
curl http://localhost:8000/health

# Verificar configuração CORS no main.py
```

### 5. Erro de WebSocket
```bash
# Verificar se porta 8001 está livre
netstat -tulpn | grep 8001

# Iniciar servidor WebSocket
cd backend
python websocket_server.py
```

## 📊 Monitoramento

### 1. Logs do Backend
```bash
# Logs da aplicação
tail -f logs/app.log

# Logs de erro
tail -f logs/error.log
```

### 2. Logs do Frontend
- Abrir DevTools (F12)
- Aba Console
- Verificar erros JavaScript

### 3. Métricas do Sistema
- **CPU**: Monitorar uso durante detecção
- **RAM**: Verificar consumo de memória
- **Rede**: Monitorar tráfego de câmeras

## 🔒 Segurança

### 1. Configurações de Produção
```bash
# Alterar senhas padrão
# Configurar HTTPS
# Configurar firewall
# Backup do banco de dados
```

### 2. Usuários e Permissões
- **Admin**: Acesso total
- **User**: Apenas visualização
- **JWT**: Tokens com expiração

### 3. Câmeras IP
- **Autenticação**: Usar credenciais seguras
- **Rede**: Isolar em VLAN
- **Criptografia**: RTSP over TLS

## 📈 Performance

### 1. Otimizações de IA
- **GPU**: Usar CUDA se disponível
- **Batch**: Processar múltiplos frames
- **Cache**: Armazenar resultados

### 2. Otimizações de Banco
- **Índices**: Criar índices nas tabelas
- **Connection Pool**: Configurar pool de conexões
- **Backup**: Backup automático

### 3. Otimizações de Frontend
- **Lazy Loading**: Carregar componentes sob demanda
- **Cache**: Usar React Query
- **Compressão**: Gzip/Brotli

## 🆘 Suporte

### 1. Documentação
- **API**: http://localhost:8000/docs
- **Código**: Comentários inline
- **README**: Arquivos README.md

### 2. Logs e Debug
- **Backend**: Logs detalhados
- **Frontend**: Console do navegador
- **Banco**: Logs do MySQL

### 3. Comunidade
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Wiki**: Documentação wiki

## 🎉 Próximos Passos

1. **Testar com câmeras reais**
2. **Configurar notificações push**
3. **Implementar heatmap**
4. **Adicionar relatórios**
5. **Deploy em produção**

---

**Parabéns!** 🎊 Seu sistema SecureVision está configurado e funcionando!

Para dúvidas ou problemas, consulte a documentação ou abra uma issue no repositório.

