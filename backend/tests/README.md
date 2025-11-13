# Testes de Integração - SecureVision

## Descrição

Este módulo contém testes de integração que verificam a comunicação e funcionamento conjunto entre diferentes módulos e serviços do sistema SecureVision.

## Testes Implementados

### 1. Autenticação e Autorização
- Login via API
- Obtenção de token de acesso
- Validação de token

### 2. Criação de Câmera
- Criação via API REST
- Criação via serviço (CameraService)
- Persistência no banco de dados
- Validação de dados

### 3. Criação de Eventos
- Criação via serviço (EventService)
- Relacionamento com câmera (Foreign Key)
- Persistência no banco de dados

### 4. Relacionamento Câmera-Eventos
- Verificação de integridade referencial
- Consulta de eventos por câmera
- Validação de Foreign Keys

### 5. Deletar Câmera com Eventos
- Deleção em cascata de eventos
- Verificação de integridade após deleção
- Limpeza de recursos

### 6. Endpoints da API
- GET /cameras/
- GET /events/
- GET /cameras/stats/summary

## Pré-requisitos

1. Servidor backend rodando na porta 8000
2. Banco de dados MySQL configurado e acessível
3. Usuário de teste criado (admin/admin123 por padrão)
4. Dependências instaladas:
   ```bash
   pip install requests sqlalchemy pymysql
   ```

## Como Executar

### Opção 1: Executar diretamente
```bash
cd backend
python tests/test_integration.py
```

### Opção 2: Executar como módulo
```bash
cd backend
python -m tests.test_integration
```

## Saída Esperada

O teste produzirá uma saída colorida indicando:
- ✓ Testes que passaram (verde)
- ✗ Testes que falharam (vermelho)
- ℹ Informações gerais (azul)
- ⚠ Avisos (amarelo)

Ao final, será exibido um resumo com:
- Total de testes executados
- Quantidade de testes que passaram
- Quantidade de testes que falharam
- Detalhes dos testes que falharam

## Exemplo de Saída

```
============================================================
INICIANDO TESTES DE INTEGRAÇÃO
============================================================
[10:30:15] Base URL: http://localhost:8000/api/v1

============================================================
TESTE 1: Autenticação e Autorização
============================================================
✓ [10:30:16] Autenticação - Login: PASSOU
✓ [10:30:16] Autenticação - Token: PASSOU

============================================================
TESTE 2: Criação de Câmera
============================================================
✓ [10:30:17] Criação de Câmera - API: PASSOU
✓ [10:30:17] Criação de Câmera - Banco de Dados: PASSOU
...

============================================================
RESUMO DOS TESTES
============================================================
Total de testes: 15
Passou: 15
Falhou: 0
============================================================
TODOS OS TESTES PASSARAM!
```

## Limpeza Automática

O teste realiza limpeza automática de recursos criados durante a execução:
- Câmeras de teste são deletadas
- Eventos de teste são deletados
- Banco de dados é deixado em estado limpo

## Troubleshooting

### Erro: Connection refused
- Verifique se o servidor backend está rodando
- Confirme que está na porta 8000

### Erro: Authentication failed
- Verifique se o usuário admin existe
- Confirme as credenciais (admin/admin123)

### Erro: Database connection failed
- Verifique as configurações do banco em `config.py`
- Confirme que o MySQL está rodando
- Verifique as credenciais do banco

### Erro: Foreign Key constraint
- Este erro indica problema na deleção em cascata
- Verifique se o código de deleção está correto
- Confirme que os eventos estão sendo deletados antes da câmera

## Estrutura do Código

```
tests/
├── __init__.py              # Inicialização do módulo
├── test_integration.py      # Teste de integração principal
└── README.md                # Este arquivo
```

## Notas Importantes

- Os testes criam dados reais no banco de dados
- Os dados são limpos automaticamente ao final
- Se os testes falharem, pode haver dados residuais no banco
- Execute os testes em ambiente de desenvolvimento/teste
- Não execute em produção sem revisar cuidadosamente

## Próximos Passos

Testes adicionais que podem ser implementados:
- Testes de performance
- Testes de carga
- Testes de segurança
- Testes de detecção em tempo real
- Testes de WebSocket
- Testes de upload de arquivos


