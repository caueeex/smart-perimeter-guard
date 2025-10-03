# Configuração de Câmera Web

Este guia explica como configurar e usar sua câmera web no sistema de monitoramento.

## 🎯 Funcionalidades Implementadas

### ✅ Backend
- **Endpoint `/api/v1/webcam/devices`**: Lista câmeras disponíveis
- **Endpoint `/api/v1/webcam/test/{index}`**: Testa câmera específica
- **Suporte a webcam no serviço de detecção**: Processamento em tempo real
- **Script de teste**: `backend/scripts/test_webcam.py`

### ✅ Frontend
- **Componente WebcamSelector**: Interface para selecionar câmeras
- **Suporte a webcam no LiveStream**: Visualização ao vivo
- **Tabs no formulário**: Separação entre câmera web e IP
- **Integração completa**: Dashboard e página de câmeras

## 🚀 Como Usar

### 1. Testar Câmeras Disponíveis

Execute o script de teste para verificar quais câmeras estão disponíveis:

```bash
cd backend
python scripts/test_webcam.py
```

### 2. Adicionar Câmera Web

1. **No Dashboard ou página de Câmeras:**
   - Clique em "Nova Câmera"
   - Selecione a aba "Câmera do PC"
   - O sistema irá listar câmeras disponíveis
   - Teste a câmera antes de selecionar
   - Preencha nome e localização
   - Clique em "Adicionar Câmera"

2. **Configuração automática:**
   - Nome da câmera é preenchido automaticamente
   - URL do stream é gerada automaticamente (`webcam://0`)
   - Resolução é detectada automaticamente

### 3. Visualização ao Vivo

- A câmera web aparecerá no dashboard com stream ao vivo
- Use os controles para play/pause, mute e tela cheia
- Configure áreas de detecção se necessário

### 4. Configuração de Detecção

- Acesse a página de Câmeras
- Clique em "Configurar" na câmera desejada
- Desenhe linhas e zonas de detecção no canvas
- Ajuste sensibilidade e outros parâmetros

## 🔧 Requisitos Técnicos

### Backend
- Python 3.8+
- OpenCV (`pip install opencv-python`)
- FastAPI
- Câmera conectada ao computador

### Frontend
- Navegador moderno com suporte a WebRTC
- Permissão de acesso à câmera
- HTTPS (requerido para getUserMedia em produção)

## 🐛 Solução de Problemas

### Câmera não aparece na lista
- Verifique se a câmera está conectada
- Feche outros aplicativos que possam estar usando a câmera
- Reinicie o navegador
- Execute o script de teste: `python scripts/test_webcam.py`

### Erro de permissão no navegador
- Clique no ícone de câmera na barra de endereços
- Permita o acesso à câmera
- Recarregue a página

### Stream não carrega
- Verifique se a câmera não está sendo usada por outro aplicativo
- Teste a câmera no script de teste
- Verifique os logs do backend

### Detecção não funciona
- Configure áreas de detecção na página de câmeras
- Ajuste a sensibilidade
- Verifique se a detecção está habilitada

## 📱 URLs de Stream

O sistema usa URLs especiais para câmeras web:

- **Formato**: `webcam://{index}`
- **Exemplo**: `webcam://0` (primeira câmera)
- **Exemplo**: `webcam://1` (segunda câmera)

## 🔒 Segurança

- O sistema solicita permissão antes de acessar a câmera
- Streams são processados localmente
- Nenhum vídeo é enviado para servidores externos
- Dados são armazenados localmente no banco de dados

## 📊 Monitoramento

- Estatísticas em tempo real no dashboard
- Eventos de detecção são registrados
- Screenshots são salvos automaticamente
- Notificações em tempo real via WebSocket

## 🎛️ Configurações Avançadas

### Sensibilidade
- **Baixa (1-30)**: Menos detecções, mais precisão
- **Média (31-70)**: Equilíbrio entre precisão e detecção
- **Alta (71-100)**: Mais detecções, pode ter falsos positivos

### FPS
- **15 FPS**: Economia de recursos
- **30 FPS**: Qualidade padrão
- **60 FPS**: Máxima qualidade (requer hardware potente)

### Resolução
- **640x480**: Economia de recursos
- **1280x720**: Qualidade HD
- **1920x1080**: Máxima qualidade

## 🆘 Suporte

Se encontrar problemas:

1. Execute o script de teste
2. Verifique os logs do backend
3. Teste em outro navegador
4. Verifique as permissões do sistema

## 🔄 Atualizações Futuras

- Suporte a múltiplas câmeras simultâneas
- Gravação de vídeo contínua
- Detecção de objetos específicos
- Integração com sistemas de alarme
- App mobile para monitoramento remoto
