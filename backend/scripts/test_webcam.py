#!/usr/bin/env python3
"""
Script para testar câmeras web disponíveis
"""
import cv2
import sys

def test_cameras():
    """Testar câmeras disponíveis"""
    print("🔍 Procurando câmeras disponíveis...")
    
    available_cameras = []
    
    # Testar índices de 0 a 10
    for i in range(10):
        print(f"Testando câmera {i}...", end=" ")
        
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            # Tentar ler um frame
            ret, frame = cap.read()
            if ret:
                # Obter propriedades
                width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                fps = cap.get(cv2.CAP_PROP_FPS)
                
                available_cameras.append({
                    'index': i,
                    'resolution': f"{width}x{height}",
                    'fps': fps
                })
                
                print(f"✅ OK - {width}x{height} @ {fps:.1f}fps")
            else:
                print("❌ Não conseguiu ler frame")
        else:
            print("❌ Não conseguiu abrir")
        
        cap.release()
    
    print(f"\n📊 Total de câmeras encontradas: {len(available_cameras)}")
    
    if available_cameras:
        print("\n📋 Câmeras disponíveis:")
        for cam in available_cameras:
            print(f"  - Câmera {cam['index']}: {cam['resolution']} @ {cam['fps']:.1f}fps")
        
        print(f"\n🎯 Para usar no sistema:")
        print(f"   URL: webcam://{available_cameras[0]['index']}")
    else:
        print("\n⚠️  Nenhuma câmera encontrada!")
        print("   Verifique se sua câmera está conectada e não está sendo usada por outro aplicativo.")
    
    return available_cameras

if __name__ == "__main__":
    try:
        available_cameras = test_cameras()
        sys.exit(0 if available_cameras else 1)
    except KeyboardInterrupt:
        print("\n\n⏹️  Teste interrompido pelo usuário")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erro durante o teste: {e}")
        sys.exit(1)
