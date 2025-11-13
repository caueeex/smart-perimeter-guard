# Teste de Carga - SecureVision

## Descrição

Este módulo contém scripts para executar testes de carga no sistema SecureVision, permitindo avaliar:
- **Desempenho**: Tempo de resposta das requisições
- **Capacidade**: Requisições por segundo (RPS) que o sistema suporta
- **Estabilidade**: Taxa de sucesso sob carga
- **Gargalos**: Endpoints mais lentos que precisam de otimização

## Pré-requisitos

1. Servidor backend rodando na porta 8000
2. Banco de dados MySQL configurado e acessível
3. Usuário de teste criado (admin/admin123 por padrão)
4. Python 3.8+ instalado
5. Biblioteca `requests` instalada:
   ```bash
   pip install requests
   ```

## Como Executar

### Opção 1: Executar com parâmetros padrão

```bash
cd backend
python tests/test_load.py
```

### Opção 2: Executar com parâmetros customizados

```bash
cd backend
python tests/test_load.py --users 20 --requests 15 --ramp-up 10 --save-json --save-csv
```

### Opção 3: Usar script auxiliar (Windows)

```cmd
cd backend
tests\run_load_test.bat
```

### Opção 4: Usar script auxiliar (Linux/Mac)

```bash
cd backend
chmod +x tests/run_load_test.sh
./tests/run_load_test.sh
```

## Parâmetros do Teste

- `--users` ou `-u`: Número de usuários concorrentes (padrão: 10)
- `--requests` ou `-r`: Requisições por usuário (padrão: 10)
- `--ramp-up` ou `-t`: Tempo de ramp-up em segundos (padrão: 5)
- `--save-json`: Salvar relatório em formato JSON
- `--save-csv`: Salvar resultados detalhados em CSV

## Exemplos de Uso

### Teste Básico (10 usuários, 10 requisições cada)
```bash
python tests/test_load.py --users 10 --requests 10
```

### Teste de Carga Moderada (20 usuários, 20 requisições cada)
```bash
python tests/test_load.py --users 20 --requests 20 --ramp-up 10 --save-json
```

### Teste de Carga Pesada (50 usuários, 50 requisições cada)
```bash
python tests/test_load.py --users 50 --requests 50 --ramp-up 15 --save-json --save-csv
```

### Teste de Stress (100 usuários, 100 requisições cada)
```bash
python tests/test_load.py --users 100 --requests 100 --ramp-up 20 --save-json --save-csv
```

## Endpoints Testados

O teste executa requisições nos seguintes endpoints:

1. **GET /api/v1/cameras/** - Listar câmeras
2. **GET /api/v1/cameras/stats/summary** - Estatísticas de câmeras
3. **GET /api/v1/events/** - Listar eventos
4. **POST /api/v1/cameras/** - Criar câmera (ocasionalmente)

## Relatórios Gerados

### 1. Relatório no Console
O teste imprime um relatório detalhado no console com:
- Configuração do teste
- Resumo geral (tempo total, sucesso, falhas, RPS)
- Tempo de resposta (média, mediana, min, max)
- Métricas por endpoint
- Gargalos identificados
- Códigos de status HTTP
- Erros encontrados

### 2. Relatório JSON
Se usado `--save-json`, gera um arquivo JSON em `tests/reports/` com todos os dados do teste.

### 3. Relatório CSV
Se usado `--save-csv`, gera um arquivo CSV em `tests/reports/` com resultados detalhados de cada requisição.

### 4. Relatório Markdown
Após executar o teste, você pode gerar um relatório em Markdown:

```bash
python tests/generate_load_report.py tests/reports/load_test_report_YYYYMMDD_HHMMSS.json
```

## Métricas Coletadas

### Métricas Gerais
- **Tempo total**: Duração total do teste
- **Total de requisições**: Número total de requisições executadas
- **Requisições bem-sucedidas**: Requisições com status 2xx
- **Requisições com falha**: Requisições com erro ou status 4xx/5xx
- **Taxa de sucesso**: Percentual de requisições bem-sucedidas
- **RPS**: Requisições por segundo

### Métricas de Tempo de Resposta
- **Média**: Tempo médio de resposta
- **Mediana**: Tempo mediano de resposta
- **Mínimo**: Tempo mínimo de resposta
- **Máximo**: Tempo máximo de resposta
- **Desvio padrão**: Variabilidade dos tempos de resposta

### Métricas por Endpoint
Para cada endpoint testado:
- Total de requisições
- Taxa de sucesso
- Tempo de resposta (média, mediana, min, max)
- Desvio padrão

## Interpretação dos Resultados

### Taxa de Sucesso
- **95-100%**: Excelente
- **90-95%**: Bom
- **85-90%**: Aceitável
- **<85%**: Precisa de investigação

### Tempo de Resposta
- **< 0.5s**: Excelente
- **0.5-1.0s**: Bom
- **1.0-2.0s**: Aceitável
- **> 2.0s**: Precisa de otimização

### Requisições por Segundo (RPS)
Depende da capacidade do servidor, mas valores típicos:
- **> 100 RPS**: Excelente
- **50-100 RPS**: Bom
- **20-50 RPS**: Aceitável
- **< 20 RPS**: Pode precisar de otimização

## Gargalos Identificados

O relatório identifica automaticamente os endpoints mais lentos, ajudando a priorizar otimizações.

## Recomendações Baseadas nos Resultados

O relatório Markdown inclui recomendações automáticas baseadas nos resultados:
- Se tempo de resposta > 1s: Sugere otimização de queries, cache, índices
- Se taxa de sucesso < 95%: Sugere revisão de tratamento de erros, limites
- Se RPS < 10: Sugere escalabilidade horizontal, pool de conexões

## Troubleshooting

### Erro: Connection refused
- Verifique se o servidor backend está rodando
- Confirme que está na porta 8000

### Erro: Authentication failed
- Verifique se o usuário admin existe
- Confirme as credenciais (admin/admin123)

### Erro: Timeout
- Aumente o timeout no código (padrão: 30s)
- Verifique se o servidor está respondendo

### Muitas falhas
- Reduza o número de usuários concorrentes
- Aumente o tempo de ramp-up
- Verifique a capacidade do servidor/banco de dados

## Limitações

- O teste usa threads Python (GIL pode limitar concorrência real)
- Não simula comportamento real de usuários (sem pensar/esperar entre ações)
- Testa apenas alguns endpoints principais
- Não inclui testes de WebSocket ou streaming

## Próximos Passos

Melhorias possíveis:
- Usar ferramentas mais avançadas (Locust, JMeter)
- Adicionar mais endpoints
- Simular comportamento real de usuários
- Testes de carga distribuída
- Monitoramento de recursos do servidor (CPU, memória)
- Testes de stress e spike


