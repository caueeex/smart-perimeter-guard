"""
Script de teste rápido para verificar se as dependências estão instaladas
"""
import sys

def check_dependencies():
    """Verificar se todas as dependências estão instaladas"""
    required = {
        'matplotlib': 'matplotlib',
        'seaborn': 'seaborn',
        'pandas': 'pandas',
        'numpy': 'numpy',
        'sklearn': 'scikit-learn'
    }
    
    missing = []
    for module_name, package_name in required.items():
        try:
            __import__(module_name)
            print(f"✓ {package_name} instalado")
        except ImportError:
            print(f"✗ {package_name} NÃO instalado")
            missing.append(package_name)
    
    if missing:
        print(f"\n❌ Dependências faltando: {', '.join(missing)}")
        print("Instale com: pip install " + " ".join(missing))
        return False
    else:
        print("\n✓ Todas as dependências estão instaladas!")
        return True

if __name__ == "__main__":
    print("Verificando dependências para geração de gráficos...")
    print("=" * 50)
    if check_dependencies():
        sys.exit(0)
    else:
        sys.exit(1)

