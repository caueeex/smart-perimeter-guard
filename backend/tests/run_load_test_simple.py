#!/usr/bin/env python3
"""
Script simplificado para executar teste de carga e gerar relatório
"""
import sys
import os
import subprocess
from datetime import datetime

def main():
    print("=" * 70)
    print("Teste de Carga - SecureVision")
    print("=" * 70)
    print()
    
    # Verificar se o servidor está rodando
    print("Verificando se o servidor está rodando...")
    try:
        import requests
        response = requests.get("http://localhost:8000/api/v1/", timeout=5)
        print("✓ Servidor está rodando!")
    except:
        print("✗ ERRO: Servidor não está rodando na porta 8000")
        print("Por favor, inicie o servidor antes de executar o teste")
        return 1
    
    print()
    
    # Perguntar configurações
    print("Configuração do teste:")
    try:
        num_users = int(input("  Número de usuários concorrentes [10]: ") or "10")
        requests_per_user = int(input("  Requisições por usuário [10]: ") or "10")
        ramp_up = int(input("  Tempo de ramp-up (segundos) [5]: ") or "5")
    except KeyboardInterrupt:
        print("\nTeste cancelado.")
        return 1
    except ValueError:
        print("Valores inválidos. Usando padrões.")
        num_users = 10
        requests_per_user = 10
        ramp_up = 5
    
    print()
    print("Executando teste de carga...")
    print()
    
    # Executar teste
    script_path = os.path.join(os.path.dirname(__file__), "test_load.py")
    cmd = [
        sys.executable,
        script_path,
        "--users", str(num_users),
        "--requests", str(requests_per_user),
        "--ramp-up", str(ramp_up),
        "--save-json",
        "--save-csv"
    ]
    
    try:
        result = subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"\n✗ Erro ao executar teste: {e}")
        return 1
    except KeyboardInterrupt:
        print("\n\nTeste interrompido pelo usuário.")
        return 1
    
    # Encontrar último relatório JSON
    reports_dir = os.path.join(os.path.dirname(__file__), "reports")
    json_files = [
        f for f in os.listdir(reports_dir)
        if f.startswith("load_test_report_") and f.endswith(".json")
    ]
    
    if json_files:
        # Ordenar por data de modificação
        json_files.sort(key=lambda f: os.path.getmtime(os.path.join(reports_dir, f)), reverse=True)
        latest_json = os.path.join(reports_dir, json_files[0])
        
        print()
        print("Gerando relatório em Markdown...")
        
        # Gerar relatório Markdown
        report_script = os.path.join(os.path.dirname(__file__), "generate_load_report.py")
        try:
            subprocess.run([
                sys.executable,
                report_script,
                latest_json
            ], check=True)
            
            print()
            print("=" * 70)
            print("Teste concluído com sucesso!")
            print("=" * 70)
            print(f"Relatórios salvos em: {reports_dir}/")
            print()
            
            return 0
        except subprocess.CalledProcessError as e:
            print(f"\n⚠ Aviso: Erro ao gerar relatório Markdown: {e}")
            print("Relatório JSON ainda está disponível.")
            return 0
    else:
        print("\n⚠ Aviso: Nenhum relatório JSON foi encontrado.")
        return 1

if __name__ == "__main__":
    sys.exit(main())


