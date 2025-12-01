# Geração de Gráficos para Artigo Acadêmico

Este script gera 13 gráficos e diagramas para o artigo acadêmico sobre o projeto SecureVision.

## Instalação

Primeiro, instale as dependências adicionais:

```bash
cd backend
pip install -r scripts/requirements_charts.txt
```

## Uso

Execute o script:

```bash
cd backend
python scripts/generate_article_charts.py
```

Os gráficos serão salvos em `backend/article_charts/` com os seguintes nomes:

1. `imagem_1_evolucao_vigilancia.png` - Evolução dos sistemas de vigilância
2. `imagem_2_abordagens_deteccao.png` - Comparativo de abordagens de detecção
3. `imagem_3_tabela_metodos_dl.png` - Tabela comparativa de métodos de deep learning
4. `imagem_4_arquitetura_sistema.png` - Diagrama de arquitetura do sistema
5. `imagem_5_fluxograma_deteccao.png` - Fluxograma do processo de detecção
6. `imagem_6_arquitetura_neural.png` - Diagrama da arquitetura neural
7. `imagem_7_tempo_resposta_carga.png` - Tempo de resposta em testes de carga
8. `imagem_8_comparativo_endpoints.png` - Comparativo de endpoints da API
9. `imagem_9_matriz_confusao.png` - Matriz de confusão
10. `imagem_10_curvas_pr_roc.png` - Curvas PR e ROC
11. `imagem_11_dashboard_monitoramento.png` - Dashboard de monitoramento
12. `imagem_12_reducao_falsos_positivos.png` - Redução de falsos positivos
13. `imagem_13_tabela_desempenho.png` - Tabela de desempenho comparativo
14. `imagem_14_roadmap_melhorias.png` - Roadmap de melhorias futuras

## Dados Utilizados

O script tenta usar dados reais do banco de dados quando disponível:
- Eventos de detecção
- Câmeras cadastradas
- Dados de testes de carga (CSV)

Quando dados reais não estão disponíveis, o script usa dados fictícios baseados em literatura e valores realistas.

## Personalização

Você pode modificar os dados no script para refletir seus resultados reais. Procure pelas funções `generate_image_X()` e ajuste os valores conforme necessário.

