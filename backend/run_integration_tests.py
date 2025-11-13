#!/usr/bin/env python3
"""
Script auxiliar para executar testes de integração
"""
import sys
import os

# Adicionar o diretório backend ao path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

if __name__ == "__main__":
    from tests.test_integration import IntegrationTest
    
    print("=" * 60)
    print("SecureVision - Testes de Integração")
    print("=" * 60)
    print()
    print("Este script irá executar testes de integração que verificam:")
    print("  - Autenticação e autorização")
    print("  - Criação e gerenciamento de câmeras")
    print("  - Criação e gerenciamento de eventos")
    print("  - Comunicação entre serviços")
    print("  - Integridade referencial (Foreign Keys)")
    print("  - Deletar câmera com eventos relacionados")
    print("  - Endpoints da API")
    print()
    print("Certifique-se de que:")
    print("  ✓ Servidor backend está rodando na porta 8000")
    print("  ✓ Banco de dados MySQL está configurado")
    print("  ✓ Usuário admin existe (admin/admin123)")
    print()
    
    resposta = input("Deseja continuar? (s/N): ").strip().lower()
    
    if resposta not in ['s', 'sim', 'y', 'yes']:
        print("Testes cancelados.")
        sys.exit(0)
    
    tester = IntegrationTest()
    tester.run_all_tests()
    
    # Retornar código de saída baseado nos resultados
    failed = sum(1 for r in tester.test_results if not r["passed"])
    sys.exit(1 if failed > 0 else 0)


