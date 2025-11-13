@echo off
REM Script para executar teste de carga e gerar relatório no Windows

echo ==========================================
echo Teste de Carga - SecureVision
echo ==========================================
echo.

REM Verificar se o servidor está rodando
echo Verificando se o servidor está rodando...
curl -s http://localhost:8000/api/v1/ >nul 2>&1
if errorlevel 1 (
    echo ERRO: Servidor não está rodando na porta 8000
    echo Por favor, inicie o servidor antes de executar o teste
    exit /b 1
)

echo Servidor está rodando!
echo.

REM Executar teste de carga
echo Executando teste de carga...
python tests\test_load.py --users 10 --requests 10 --ramp-up 5 --save-json --save-csv

REM Encontrar o último relatório JSON gerado (Windows PowerShell)
for /f "delims=" %%i in ('powershell -command "Get-ChildItem tests\reports\load_test_report_*.json | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName"') do set LATEST_REPORT=%%i

if defined LATEST_REPORT (
    echo.
    echo Gerando relatório em Markdown...
    python tests\generate_load_report.py "%LATEST_REPORT%"
    
    echo.
    echo ==========================================
    echo Teste concluído!
    echo Relatórios salvos em: tests\reports\
    echo ==========================================
) else (
    echo ERRO: Nenhum relatório foi gerado
    exit /b 1
)


