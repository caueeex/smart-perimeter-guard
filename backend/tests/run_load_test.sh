#!/bin/bash
# Script para executar teste de carga e gerar relatório

echo "=========================================="
echo "Teste de Carga - SecureVision"
echo "=========================================="
echo ""

# Verificar se o servidor está rodando
echo "Verificando se o servidor está rodando..."
if ! curl -s http://localhost:8000/api/v1/ > /dev/null; then
    echo "ERRO: Servidor não está rodando na porta 8000"
    echo "Por favor, inicie o servidor antes de executar o teste"
    exit 1
fi

echo "Servidor está rodando!"
echo ""

# Executar teste de carga
echo "Executando teste de carga..."
python tests/test_load.py --users 10 --requests 10 --ramp-up 5 --save-json --save-csv

# Encontrar o último relatório JSON gerado
LATEST_REPORT=$(ls -t tests/reports/load_test_report_*.json 2>/dev/null | head -1)

if [ -n "$LATEST_REPORT" ]; then
    echo ""
    echo "Gerando relatório em Markdown..."
    python tests/generate_load_report.py "$LATEST_REPORT"
    
    echo ""
    echo "=========================================="
    echo "Teste concluído!"
    echo "Relatórios salvos em: tests/reports/"
    echo "=========================================="
else
    echo "ERRO: Nenhum relatório foi gerado"
    exit 1
fi


