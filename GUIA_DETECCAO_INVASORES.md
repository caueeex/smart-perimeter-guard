# 🛡️ Guia do Sistema de Detecção de Invasores

## ✅ Funcionalidades Implementadas

### 🎥 **Configuração de Câmera com Visualização ao Vivo**
- ✅ Visualização em tempo real da câmera
- ✅ Interface para configurar áreas de detecção
- ✅ Desenho interativo de linhas e zonas
- ✅ Configuração de parâmetros (sensibilidade, FPS, resolução)

### 🎯 **Sistema de Detecção de Áreas**
- ✅ **Linhas de Detecção**: Clique em dois pontos para definir
- ✅ **Zonas de Detecção**: Clique em múltiplos pontos para formar polígono
- ✅ **Gerenciamento**: Deletar, editar e limpar áreas
- ✅ **Visualização**: Áreas desenhadas sobre o vídeo ao vivo

### 🚨 **Lógica de Detecção de Invasores**
- ✅ **YOLOv8**: Detecção de pessoas e objetos
- ✅ **Cruzamento de Linha**: Alerta quando objeto cruza linha definida
- ✅ **Invasão de Zona**: Alerta quando objeto entra em zona definida
- ✅ **Cooldown**: Evita alertas repetitivos (5 segundos)
- ✅ **Screenshots**: Salva imagens dos eventos detectados

## 🎮 Como Usar

### **1. Configurar Câmera**
1. Acesse a página **"Câmeras"**
2. Clique em **"Configurar"** na câmera desejada
3. A câmera será exibida ao vivo no modal

### **2. Definir Áreas de Detecção**

#### **Linha de Detecção:**
1. Clique no botão **"Linha"**
2. Clique em **dois pontos** no vídeo para definir a linha
3. A linha vermelha será desenhada automaticamente

#### **Zona de Detecção:**
1. Clique no botão **"Zona"**
2. Clique em **múltiplos pontos** no vídeo para formar o polígono
3. A zona vermelha será preenchida automaticamente

### **3. Configurar Parâmetros**
- **Sensibilidade**: 1-100% (padrão: 50%)
- **FPS**: 15, 30 ou 60 (padrão: 15)
- **Resolução**: 640x480, 1280x720, 1920x1080

### **4. Salvar Configurações**
1. Clique em **"Salvar Configurações"**
2. As áreas serão salvas no banco de dados
3. A detecção será ativada automaticamente

## 🔧 **Backend - APIs Implementadas**

### **Endpoints de Detecção:**
```
POST /api/v1/detection/line/{camera_id}     # Configurar linha
POST /api/v1/detection/zone/{camera_id}     # Configurar zona
GET  /api/v1/detection/config/{camera_id}   # Obter configuração
POST /api/v1/detection/toggle/{camera_id}   # Ativar/desativar
```

### **Endpoints de Stream:**
```
GET /api/v1/stream/start/{camera_id}        # Iniciar stream
GET /api/v1/stream/stop/{camera_id}         # Parar stream
GET /api/v1/stream/frame/{camera_id}        # Obter frame
GET /api/v1/stream/info/{camera_id}         # Informações do stream
```

## 🧪 **Testando o Sistema**

### **Scripts de Teste:**
```bash
# Testar sistema completo
python backend/scripts/test_detection.py

# Testar conexão frontend-backend
python backend/scripts/test_frontend_connection.py

# Testar câmeras
python backend/scripts/test_cameras_simple.py
```

### **Teste Manual:**
1. **Configure uma linha** na câmera
2. **Mova-se** na frente da câmera
3. **Cruze a linha** definida
4. **Verifique** se um evento foi criado
5. **Confira** a imagem salva em `backend/uploads/screenshots/`

## 📊 **Monitoramento**

### **Eventos Detectados:**
- **Tipo**: `intrusion`
- **Confiança**: Baseada na detecção YOLO
- **Descrição**: "Intrusão detectada - X objetos"
- **Imagem**: Screenshot do momento da detecção
- **Timestamp**: Data/hora do evento

### **Logs do Sistema:**
```bash
# Logs do backend
tail -f backend/logs/app.log

# Logs de detecção
grep "detectado" backend/logs/app.log
```

## 🎯 **Funcionalidades Avançadas**

### **Algoritmos de Detecção:**
- **YOLOv8**: Detecção de objetos em tempo real
- **Ray Casting**: Verificação de ponto dentro de polígono
- **Distância Ponto-Linha**: Verificação de cruzamento
- **Background Subtraction**: Detecção de movimento

### **Otimizações:**
- **Processamento a cada 5 frames** (reduz carga)
- **Cooldown de 5 segundos** entre detecções
- **Buffer de 1 frame** para câmeras RTSP
- **Threads separadas** para cada câmera

## 🚀 **Próximos Passos**

### **Melhorias Sugeridas:**
1. **Notificações em tempo real** via WebSocket
2. **Histórico de eventos** com filtros
3. **Relatórios** de detecção
4. **Múltiplas zonas** por câmera
5. **Detecção de direção** (entrada/saída)
6. **Integração com alarmes** externos

### **Configurações Avançadas:**
- **Horários de funcionamento**
- **Zonas temporais** (diferentes áreas por horário)
- **Filtros de objeto** (apenas pessoas, carros, etc.)
- **Sensibilidade dinâmica** (ajuste automático)

## 🎉 **Sistema Funcionando!**

O sistema de detecção de invasores está **100% funcional** com:
- ✅ Configuração visual de áreas
- ✅ Detecção em tempo real
- ✅ Salvamento de eventos
- ✅ Interface intuitiva
- ✅ APIs completas
- ✅ Testes automatizados

**Para começar a usar:**
1. Acesse a página de Câmeras
2. Configure uma área de detecção
3. Salve as configurações
4. Mova-se na frente da câmera
5. Verifique os eventos detectados!
