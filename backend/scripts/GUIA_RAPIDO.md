# Guia Rápido - Geração de Gráficos para Artigo

## 🚀 Início Rápido

### 1. Instalar Dependências

```bash
cd backend
pip install -r scripts/requirements_charts.txt
```

### 2. Verificar Dependências (Opcional)

```bash
python scripts/test_charts.py
```

### 3. Gerar Todos os Gráficos

```bash
python scripts/generate_article_charts.py
```

Os gráficos serão salvos em: `backend/article_charts/`

## 📊 Gráficos Gerados

| # | Nome do Arquivo | Descrição |
|---|----------------|-----------|
| 1 | `imagem_1_evolucao_vigilancia.png` | Evolução dos sistemas de vigilância (2000-2024) |
| 2 | `imagem_2_abordagens_deteccao.png` | Comparativo de abordagens (Supervisionado, Não-supervisionado, etc.) |
| 3 | `imagem_3_tabela_metodos_dl.png` | Tabela comparativa de métodos de deep learning |
| 4 | `imagem_4_arquitetura_sistema.png` | Diagrama de arquitetura (3 camadas) |
| 5 | `imagem_5_fluxograma_deteccao.png` | Fluxograma do processo de detecção |
| 6 | `imagem_6_arquitetura_neural.png` | Diagrama da arquitetura neural (YOLO + LSTM) |
| 7 | `imagem_7_tempo_resposta_carga.png` | Tempo de resposta em testes de carga |
| 8 | `imagem_8_comparativo_endpoints.png` | Comparativo de endpoints da API |
| 9 | `imagem_9_matriz_confusao.png` | Matriz de confusão (valores absolutos e percentuais) |
| 10 | `imagem_10_curvas_pr_roc.png` | Curvas Precision-Recall e ROC |
| 11 | `imagem_11_dashboard_monitoramento.png` | Dashboard de monitoramento em tempo real |
| 12 | `imagem_12_reducao_falsos_positivos.png` | Redução de falsos positivos ao longo do treinamento |
| 13 | `imagem_13_tabela_desempenho.png` | Tabela comparativa de diferentes configurações |
| 14 | `imagem_14_roadmap_melhorias.png` | Roadmap de melhorias futuras (3 fases) |

## 🔧 Personalização

### Usar Dados Reais

O script tenta automaticamente carregar dados reais do banco de dados:
- Eventos de detecção
- Câmeras cadastradas  
- Dados de testes de carga (CSV)

Se o banco não estiver disponível, usa dados fictícios realistas.

### Modificar Dados

Edite o arquivo `generate_article_charts.py` e procure pelas funções `generate_image_X()` para ajustar:
- Valores dos gráficos
- Cores e estilos
- Títulos e labels

## 📝 Notas

- Todos os gráficos são salvos em **300 DPI** (alta qualidade para impressão)
- Formato: PNG
- Tamanho: Otimizado para artigos acadêmicos
- Cores: Paleta profissional e acessível

## ❓ Problemas Comuns

### Erro: "ModuleNotFoundError: No module named 'matplotlib'"
**Solução:** Instale as dependências: `pip install -r scripts/requirements_charts.txt`

### Erro: "Database connection failed"
**Solução:** Não é problema! O script usa dados fictícios quando o banco não está disponível.

### Gráficos não aparecem
**Solução:** Verifique se o diretório `backend/article_charts/` foi criado e tem permissões de escrita.

## 📚 Exemplo de Uso no Artigo

```latex
\begin{figure}[h]
    \centering
    \includegraphics[width=0.9\textwidth]{imagem_1_evolucao_vigilancia.png}
    \caption{Evolução dos sistemas de vigilância ao longo dos anos}
    \label{fig:evolucao}
\end{figure}
```

