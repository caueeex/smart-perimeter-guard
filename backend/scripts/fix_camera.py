#!/usr/bin/env python3
"""
Script para diagnosticar e corrigir problemas de câmera
"""
import cv2
import time
import subprocess
import sys

def check_camera_processes():
    """Verificar processos que podem estar usando a câmera"""
    print("🔍 Verificando processos que podem estar usando a câmera...")
    
    try:
        # Listar processos relacionados a câmera
        result = subprocess.run(['tasklist', '/FI', 'IMAGENAME eq *camera*'], 
                              capture_output=True, text=True, shell=True)
        print("Processos com 'camera' no nome:")
        print(result.stdout)
        
        result = subprocess.run(['tasklist', '/FI', 'IMAGENAME eq *webcam*'], 
                              capture_output=True, text=True, shell=True)
        print("Processos com 'webcam' no nome:")
        print(result.stdout)
        
        result = subprocess.run(['tasklist', '/FI', 'IMAGENAME eq *zoom*'], 
                              capture_output=True, text=True, shell=True)
        print("Processos com 'zoom' no nome:")
        print(result.stdout)
        
        result = subprocess.run(['tasklist', '/FI', 'IMAGENAME eq *teams*'], 
                              capture_output=True, text=True, shell=True)
        print("Processos com 'teams' no nome:")
        print(result.stdout)
        
    except Exception as e:
        print(f"Erro ao verificar processos: {e}")

def test_camera_with_different_backends():
    """Testar câmera com diferentes backends do OpenCV"""
    print("\n🧪 Testando câmera com diferentes backends...")
    
    backends = [
        (cv2.CAP_DSHOW, "DirectShow"),
        (cv2.CAP_MSMF, "Media Foundation"),
        (cv2.CAP_ANY, "Qualquer"),
    ]
    
    for backend, name in backends:
        print(f"\n📹 Testando backend: {name}")
        
        try:
            cap = cv2.VideoCapture(0, backend)
            
            if cap.isOpened():
                print(f"✅ Câmera aberta com {name}")
                
                # Tentar ler alguns frames
                for i in range(5):
                    ret, frame = cap.read()
                    if ret:
                        print(f"   Frame {i+1}: ✅ OK ({frame.shape})")
                    else:
                        print(f"   Frame {i+1}: ❌ Falha")
                    time.sleep(0.1)
                
                cap.release()
                print(f"✅ {name} funcionando!")
                return True
            else:
                print(f"❌ Não conseguiu abrir câmera com {name}")
                
        except Exception as e:
            print(f"❌ Erro com {name}: {e}")
    
    return False

def test_camera_permissions():
    """Testar permissões de câmera"""
    print("\n🔐 Testando permissões de câmera...")
    
    try:
        # Tentar acessar câmera diretamente
        cap = cv2.VideoCapture(0)
        
        if cap.isOpened():
            print("✅ Câmera pode ser aberta")
            
            # Verificar propriedades
            width = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
            height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
            fps = cap.get(cv2.CAP_PROP_FPS)
            
            print(f"   Resolução: {int(width)}x{int(height)}")
            print(f"   FPS: {fps}")
            
            # Tentar ler frame
            ret, frame = cap.read()
            if ret:
                print("✅ Frame lido com sucesso")
                cap.release()
                return True
            else:
                print("❌ Não conseguiu ler frame")
        else:
            print("❌ Não conseguiu abrir câmera")
            
        cap.release()
        
    except Exception as e:
        print(f"❌ Erro ao testar permissões: {e}")
    
    return False

def suggest_solutions():
    """Sugerir soluções para problemas de câmera"""
    print("\n💡 Soluções sugeridas:")
    print("1. Feche todos os aplicativos que podem estar usando a câmera:")
    print("   - Zoom, Teams, Skype, Discord")
    print("   - Navegadores (Chrome, Edge, Firefox)")
    print("   - Aplicativos de câmera (Camera, Photo Booth)")
    print("   - OBS Studio, Streamlabs")
    
    print("\n2. Reinicie o computador para liberar recursos")
    
    print("\n3. Verifique se a câmera está funcionando em outros aplicativos")
    
    print("\n4. Atualize os drivers da câmera")
    
    print("\n5. Teste com uma câmera USB diferente")

def main():
    """Função principal"""
    print("🔧 Diagnóstico de Problemas de Câmera")
    print("=" * 50)
    
    # Verificar processos
    check_camera_processes()
    
    # Testar permissões
    camera_works = test_camera_permissions()
    
    if not camera_works:
        # Testar diferentes backends
        camera_works = test_camera_with_different_backends()
    
    if camera_works:
        print("\n🎉 Câmera funcionando! O problema pode ser no frontend.")
        print("   Tente recarregar a página do dashboard.")
    else:
        print("\n❌ Câmera não está funcionando.")
        suggest_solutions()

if __name__ == "__main__":
    main()
