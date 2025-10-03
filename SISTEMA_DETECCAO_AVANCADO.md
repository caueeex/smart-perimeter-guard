# 🛡️ Sistema Avançado de Detecção de Invasores

## 📋 Visão Geral

O Sistema Avançado de Detecção de Invasores é uma solução completa que combina múltiplas tecnologias de visão computacional para detectar intrusões em tempo real com alta precisão e baixa taxa de falsos positivos.

## 🚀 Funcionalidades Implementadas

### 1. **Detecção Multi-Camada**
- **YOLO v8**: Detecção de objetos (pessoas, veículos, etc.)
- **Background Subtraction**: Detecção de movimento
- **Object Tracking**: Rastreamento contínuo de objetos
- **Geometric Analysis**: Verificação de cruzamento de linhas e zonas

### 2. **Sistema de Rastreamento Inteligente**
- Rastreamento de objetos entre frames
- Histórico de movimento
- Filtragem de ruído
- Cooldown inteligente para evitar spam de eventos

### 3. **Monitoramento em Tempo Real**
- Dashboard de status do sistema
- Métricas de performance
- Eventos em tempo real
- Reinicialização remota de câmeras

## 🔧 Configuração do Sistema

### Backend (Python/FastAPI)

#### 1. **Instalação de Dependências**
```bash
cd backend
pip install -r requirements.txt
```

#### 2. **Configuração do Modelo YOLO**
```python
# O modelo YOLO é carregado automaticamente
# Arquivo: models/yolov8n.pt
```

#### 3. **Inicialização do Serviço**
```python
# O DetectionService é inicializado automaticamente
# Arquivo: services/detection_service.py
```

### Frontend (React/TypeScript)

#### 1. **Componente de Monitoramento**
```typescript
// Componente: DetectionMonitor.tsx
// Exibe status em tempo real do sistema
```

#### 2. **Configuração de Câmeras**
```typescript
// Componente: CameraConfig.tsx
// Interface para configurar áreas de detecção
```

## 📊 Como Usar

### 1. **Configurar Câmera**
1. Acesse a página "Câmeras"
2. Clique em "Configurar" na câmera desejada
3. Desenhe áreas de detecção:
   - **Linha**: Clique em dois pontos
   - **Zona**: Clique em múltiplos pontos (mínimo 3)
4. Ajuste a sensibilidade (0-100%)
5. Salve as configurações

### 2. **Monitorar Sistema**
1. Acesse o Dashboard
2. Visualize o status do sistema em tempo real
3. Monitore eventos detectados
4. Reinicie câmeras se necessário

### 3. **Verificar Eventos**
1. Acesse a página "Eventos"
2. Visualize eventos detectados
3. Baixe imagens de evidência
4. Analise detalhes de cada evento

## 🎯 Algoritmo de Detecção

### Fluxo de Detecção:
```
1. Captura de Frame
   ↓
2. Background Subtraction
   ↓
3. Detecção YOLO
   ↓
4. Rastreamento de Objetos
   ↓
5. Verificação Geométrica
   ↓
6. Geração de Evento
```

### Parâmetros Configuráveis:
- **Sensibilidade**: 0-100% (confiança mínima do YOLO)
- **Área Mínima**: 1000 pixels (movimento significativo)
- **Threshold de Rastreamento**: 50 pixels (distância máxima)
- **Cooldown**: 3 segundos (intervalo entre eventos)

## 🔍 Tipos de Detecção

### 1. **Cruzamento de Linha**
- Detecta quando objetos cruzam uma linha definida
- Útil para controle de acesso
- Exemplo: Entrada/saída de área restrita

### 2. **Intrusão em Zona**
- Detecta quando objetos entram em uma zona definida
- Útil para proteção de áreas específicas
- Exemplo: Área de estacionamento, jardim

### 3. **Detecção de Movimento**
- Detecta qualquer movimento significativo
- Filtra ruído e pequenos movimentos
- Exemplo: Movimento suspeito em área vazia

## 📈 Métricas de Performance

### Sistema Monitora:
- **Total de Câmeras**: Número total cadastrado
- **Câmeras Ativas**: Câmeras com detecção habilitada
- **Eventos (24h)**: Eventos detectados nas últimas 24 horas
- **Tempo Ativo**: Tempo de funcionamento do sistema
- **Objetos Rastreados**: Objetos sendo rastreados em tempo real

### Por Câmera:
- **Status de Monitoramento**: Ativo/Inativo
- **Sensibilidade**: Configuração atual
- **Áreas Configuradas**: Linhas e zonas
- **Eventos Recentes**: Últimos 5 eventos
- **Performance**: FPS e qualidade de detecção

## 🛠️ API Endpoints

### Monitoramento
```
GET /api/v1/monitoring/status
GET /api/v1/monitoring/cameras/{id}/status
GET /api/v1/monitoring/events/recent
POST /api/v1/monitoring/cameras/{id}/restart
GET /api/v1/monitoring/performance
```

### Detecção
```
POST /api/v1/detection/line/{camera_id}
POST /api/v1/detection/zone/{camera_id}
GET /api/v1/detection/config/{camera_id}
POST /api/v1/detection/toggle/{camera_id}
```

## 🔧 Troubleshooting

### Problemas Comuns:

#### 1. **Câmera Não Detecta**
- Verifique se a câmera está funcionando
- Confirme se as áreas estão configuradas
- Ajuste a sensibilidade
- Reinicie a detecção da câmera

#### 2. **Muitos Falsos Positivos**
- Aumente a sensibilidade (valor mais alto)
- Ajuste as áreas de detecção
- Verifique iluminação da câmera
- Configure cooldown maior

#### 3. **Poucos Eventos Detectados**
- Diminua a sensibilidade (valor mais baixo)
- Verifique se as áreas estão corretas
- Confirme se a câmera está capturando
- Teste com movimento mais lento

#### 4. **Sistema Lento**
- Reduza o número de câmeras ativas
- Diminua a resolução das câmeras
- Aumente o intervalo entre processamentos
- Verifique recursos do servidor

## 📝 Logs e Debugging

### Logs do Sistema:
```
# Backend logs
tail -f backend/logs/detection.log

# Console do navegador
# Verifique erros JavaScript
```

### Debugging:
```python
# Teste manual do sistema
python scripts/test_advanced_detection.py

# Verificar status
curl -H "Authorization: Bearer TOKEN" \
     http://localhost:8000/api/v1/monitoring/status
```

## 🚀 Próximas Melhorias

### Funcionalidades Planejadas:
- [ ] Detecção de faces
- [ ] Reconhecimento de placas
- [ ] Análise de comportamento
- [ ] Notificações push
- [ ] Integração com sistemas de alarme
- [ ] Machine Learning personalizado
- [ ] Análise de padrões temporais

### Otimizações:
- [ ] Processamento em GPU
- [ ] Compressão de vídeo
- [ ] Cache inteligente
- [ ] Balanceamento de carga
- [ ] Clustering de eventos

## 📞 Suporte

Para suporte técnico ou dúvidas:
1. Verifique os logs do sistema
2. Execute o script de teste
3. Consulte a documentação da API
4. Verifique a configuração das câmeras

---

**Sistema desenvolvido com tecnologias de ponta para máxima eficiência e precisão na detecção de invasores.**
