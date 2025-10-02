# Especificação de Requisitos - SecureVision

## 1. Requisitos Funcionais

### RF01 - Autenticação e Controle de Acesso
- **Descrição:** Sistema deve permitir login com email e senha
- **Atores:** Administrador, Usuário Comum
- **Regras:**
  - Administrador: acesso total (CRUD câmeras, visualizar todos eventos, configurar sistema)
  - Usuário Comum: apenas visualizar câmeras e eventos
- **Status:** 🟡 Front-end implementado, aguardando back-end

### RF02 - Gerenciamento de Câmeras
- **Descrição:** Sistema deve permitir cadastro, edição e remoção de câmeras
- **Campos obrigatórios:**
  - Nome da câmera
  - Localização física
  - URL do stream (RTSP/HTTP)
  - Zona de monitoramento
- **Status:** ✅ Front-end completo

### RF03 - Configuração de Linha de Detecção
- **Descrição:** Usuário deve poder desenhar linha virtual na tela da câmera
- **Funcionalidades:**
  - Interface visual para desenhar linha
  - Salvar coordenadas da linha
  - Configurar sensibilidade da detecção
- **Status:** 🔴 A implementar (requer canvas + back-end)

### RF04 - Detecção de Invasão (IA)
- **Descrição:** Sistema deve detectar quando objeto cruza linha de segurança
- **Funcionalidades:**
  - Processar stream de vídeo em tempo real
  - Identificar objetos (pessoa, carro, animal)
  - Detectar cruzamento da linha
  - Capturar screenshot do momento exato
  - Gravar clipe de vídeo (5-10 segundos)
- **Status:** 🔴 Requer implementação Python + OpenCV

### RF05 - Registro de Eventos
- **Descrição:** Sistema deve salvar todos os eventos detectados
- **Dados salvos:**
  - Data e hora
  - ID da câmera
  - Tipo de evento (invasão/movimento/alerta)
  - Screenshot (imagem)
  - Clipe de vídeo
  - Objetos detectados (classificação IA)
- **Status:** ✅ Front-end pronto, aguardando back-end

### RF06 - Notificações em Tempo Real
- **Descrição:** Sistema deve notificar usuário imediatamente após detecção
- **Métodos:**
  - Notificação no dashboard (WebSocket)
  - Push notification no navegador (Service Worker)
  - Alerta sonoro (opcional)
- **Status:** 🟡 Estrutura front-end pronta, aguardando WebSocket back-end

### RF07 - Dashboard de Estatísticas
- **Descrição:** Exibir métricas do sistema em tempo real
- **Métricas:**
  - Total de câmeras ativas
  - Alertas ativos
  - Eventos do dia
  - Taxa de detecção
  - Câmeras online/offline
- **Status:** ✅ Implementado

### RF08 - Histórico de Eventos
- **Descrição:** Visualizar todos eventos com filtros
- **Filtros:**
  - Por tipo (invasão, movimento, alerta)
  - Por câmera
  - Por período (data/hora)
  - Busca textual
- **Status:** ✅ Front-end completo

### RF09 - Exportação de Relatórios
- **Descrição:** Gerar relatórios de eventos
- **Formatos:**
  - PDF
  - CSV
  - Excel
- **Status:** 🔴 A implementar

### RF10 - Geração de Heatmap
- **Descrição:** Mapa de calor mostrando áreas mais movimentadas
- **Funcionalidades:**
  - Visualizar padrões de movimento
  - Identificar zonas críticas
  - Análise temporal
- **Status:** 🔴 Requer módulo IA

## 2. Requisitos Não-Funcionais

### RNF01 - Desempenho
- Processamento de vídeo: mínimo 15 FPS
- Latência de notificação: máximo 2 segundos
- Tempo de resposta da interface: máximo 500ms

### RNF02 - Escalabilidade
- Suportar até 50 câmeras simultâneas
- Processar múltiplos streams em paralelo
- Arquitetura de microserviços para escalonamento horizontal

### RNF03 - Segurança
- Senhas criptografadas (bcrypt)
- Tokens JWT com expiração
- HTTPS obrigatório em produção
- RLS (Row Level Security) no banco de dados

### RNF04 - Disponibilidade
- Uptime mínimo: 99%
- Reconexão automática de câmeras
- Sistema de fallback para falhas

### RNF05 - Usabilidade
- Interface responsiva (mobile/tablet/desktop)
- Tempo de aprendizado: máximo 30 minutos
- Documentação completa

### RNF06 - Compatibilidade
- Navegadores: Chrome, Firefox, Safari (últimas 2 versões)
- Câmeras: suporte RTSP, HTTP, ONVIF
- Python 3.10+

### RNF07 - Manutenibilidade
- Código com cobertura de testes > 80%
- Documentação técnica completa
- Logs estruturados
- Versionamento semântico

## 3. Casos de Uso

### CU01 - Login no Sistema
**Ator:** Administrador/Usuário  
**Pré-condições:** Usuário cadastrado  
**Fluxo Principal:**
1. Usuário acessa página de login
2. Insere email e senha
3. Sistema valida credenciais
4. Sistema redireciona para dashboard
5. Sistema exibe perfil do usuário

**Fluxo Alternativo:**
- Credenciais inválidas → Exibir mensagem de erro

### CU02 - Cadastrar Nova Câmera
**Ator:** Administrador  
**Pré-condições:** Usuário autenticado como admin  
**Fluxo Principal:**
1. Admin clica em "Nova Câmera"
2. Preenche formulário (nome, localização, URL, zona)
3. Sistema valida URL do stream
4. Sistema salva configuração
5. Sistema inicia monitoramento

### CU03 - Configurar Linha de Detecção
**Ator:** Administrador  
**Pré-condições:** Câmera cadastrada  
**Fluxo Principal:**
1. Admin acessa configuração da câmera
2. Visualiza stream ao vivo
3. Desenha linha na interface
4. Ajusta sensibilidade
5. Sistema salva coordenadas
6. IA passa a monitorar a linha

### CU04 - Detecção de Invasão
**Ator:** Sistema (automático)  
**Fluxo Principal:**
1. IA processa frame do vídeo
2. IA detecta objeto
3. IA verifica se cruzou linha
4. Sistema captura screenshot
5. Sistema grava clipe de vídeo
6. Sistema salva evento no banco
7. Sistema envia notificação
8. Dashboard exibe alerta

### CU05 - Visualizar Eventos
**Ator:** Usuário  
**Pré-condições:** Usuário autenticado  
**Fluxo Principal:**
1. Usuário acessa "Eventos"
2. Sistema exibe timeline
3. Usuário aplica filtros (tipo, câmera, data)
4. Usuário clica em evento
5. Sistema exibe detalhes (imagem, vídeo, dados)

## 4. Modelo de Dados

### Entidade: User
```
- id: UUID (PK)
- email: String (unique)
- password_hash: String
- role: Enum (admin, user)
- created_at: Timestamp
```

### Entidade: Camera
```
- id: UUID (PK)
- name: String
- location: String
- stream_url: String
- zone: String
- detection_enabled: Boolean
- detection_line: JSON (coordenadas)
- status: Enum (online, offline, maintenance)
- created_at: Timestamp
```

### Entidade: Event
```
- id: UUID (PK)
- camera_id: UUID (FK)
- event_type: Enum (intrusion, movement, alert)
- timestamp: Timestamp
- description: String
- image_url: String
- video_url: String
- metadata: JSON (objetos detectados)
- created_at: Timestamp
```

## 5. Tecnologias e Ferramentas

### Front-end
- ✅ React 18 + TypeScript
- ✅ Vite
- ✅ Tailwind CSS + shadcn/ui
- ✅ React Router
- ✅ TanStack Query

### Back-end
- 🔴 Python 3.10+
- 🔴 FastAPI
- 🔴 SQLAlchemy
- 🔴 PostgreSQL
- 🔴 Redis

### IA
- 🔴 OpenCV
- 🔴 TensorFlow / PyTorch
- 🔴 YOLO v8
- 🔴 NumPy

### DevOps
- 🔴 Docker
- 🔴 GitHub Actions (CI/CD)
- 🔴 Nginx (reverse proxy)

## 6. Cronograma de Desenvolvimento

### Fase 1 - Front-end (✅ Concluída)
- Design system
- Páginas principais
- Componentes reutilizáveis
- Integração com API (mockada)

### Fase 2 - Back-end Python (Em andamento)
- Setup FastAPI
- Microserviços
- Autenticação JWT
- APIs REST
- WebSocket

### Fase 3 - Módulo IA (Próxima)
- Integração OpenCV
- Modelo de detecção
- Processamento de vídeo
- Captura de screenshots
- Gravação de clipes

### Fase 4 - Integração (Próxima)
- Conectar front + back
- Testes end-to-end
- Otimização de performance

### Fase 5 - Deploy (Final)
- Containerização
- CI/CD
- Monitoramento
- Documentação final

## 7. Próximos Passos Imediatos

1. ✅ Habilitar **Lovable Cloud** para autenticação e banco de dados
2. 🔴 Desenvolver back-end Python com FastAPI
3. 🔴 Implementar módulo de IA com OpenCV
4. 🔴 Integrar detecção em tempo real
5. 🔴 Implementar notificações via WebSocket
6. 🔴 Testar com câmeras reais

---

**Status:**  
✅ Completo | 🟡 Em andamento | 🔴 Não iniciado
