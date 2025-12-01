"""
Script para corrigir problema de compatibilidade YOLO com PyTorch 2.6+
"""
import subprocess
import sys
import os

def fix_yolo_pytorch26():
    """Atualizar ultralytics para versão compatível com PyTorch 2.6+"""
    print("🔧 Corrigindo compatibilidade YOLO com PyTorch 2.6+...")
    print("=" * 60)
    
    try:
        # Atualizar ultralytics
        print("\n1️⃣ Atualizando ultralytics para versão mais recente...")
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", "--upgrade", "ultralytics"],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("✅ Ultralytics atualizado com sucesso!")
            print(result.stdout)
        else:
            print("❌ Erro ao atualizar ultralytics:")
            print(result.stderr)
            return False
        
        # Verificar versão instalada
        print("\n2️⃣ Verificando versões instaladas...")
        result = subprocess.run(
            [sys.executable, "-m", "pip", "show", "ultralytics"],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print(result.stdout)
        
        result = subprocess.run(
            [sys.executable, "-m", "pip", "show", "torch"],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print(result.stdout)
        
        print("\n✅ Correção concluída!")
        print("💡 Reinicie o servidor para aplicar as mudanças.")
        return True
        
    except Exception as e:
        print(f"❌ Erro ao executar correção: {e}")
        return False

if __name__ == "__main__":
    fix_yolo_pytorch26()

