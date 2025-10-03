#!/usr/bin/env python3
"""
Script para testar o sistema avançado de detecção de invasores
"""
import requests
import json
import time
import cv2
import numpy as np
from datetime import datetime

def test_advanced_detection():
    """Testar sistema avançado de detecção"""
    print("🚀 Testando Sistema Avançado de Detecção de Invasores...")
    
    base_url = "http://localhost:8000/api/v1"
    
    # 1. Login
    try:
        print("\n1. Fazendo login...")
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        
        response = requests.post(f"{base_url}/auth/login", data=login_data, timeout=10)
        if response.status_code == 200:
            token_data = response.json()
            access_token = token_data.get("access_token")
            print("✅ Login OK")
        else:
            print(f"❌ Login falhou: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Erro no login: {e}")
        return False
    
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # 2. Listar câmeras
    try:
        print("\n2. Listando câmeras...")
        response = requests.get(f"{base_url}/cameras/", headers=headers, timeout=10)
        if response.status_code == 200:
            cameras = response.json()
            print(f"✅ {len(cameras)} câmeras encontradas")
            
            if not cameras:
                print("❌ Nenhuma câmera cadastrada")
                return False
                
            camera = cameras[0]
            camera_id = camera.get('id')
            print(f"   Usando câmera: {camera.get('name')} (ID: {camera_id})")
        else:
            print(f"❌ Erro ao listar câmeras: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Erro ao listar câmeras: {e}")
        return False
    
    # 3. Configurar linha de detecção otimizada
    try:
        print("\n3. Configurando linha de detecção otimizada...")
        line_config = {
            "start_x": 200,
            "start_y": 300,
            "end_x": 600,
            "end_y": 300,
            "thickness": 3,
            "color": "#ff0000"
        }
        
        response = requests.post(
            f"{base_url}/detection/line/{camera_id}",
            json=line_config,
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ Linha de detecção configurada")
        else:
            print(f"❌ Erro ao configurar linha: {response.status_code}")
    except Exception as e:
        print(f"❌ Erro ao configurar linha: {e}")
    
    # 4. Configurar zona de detecção otimizada
    try:
        print("\n4. Configurando zona de detecção otimizada...")
        zone_config = {
            "points": [
                {"x": 300, "y": 200},
                {"x": 500, "y": 200},
                {"x": 500, "y": 400},
                {"x": 300, "y": 400}
            ],
            "color": "#ff0000",
            "fill_color": "rgba(255, 0, 0, 0.2)"
        }
        
        response = requests.post(
            f"{base_url}/detection/zone/{camera_id}",
            json=zone_config,
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ Zona de detecção configurada")
        else:
            print(f"❌ Erro ao configurar zona: {response.status_code}")
    except Exception as e:
        print(f"❌ Erro ao configurar zona: {e}")
    
    # 5. Ativar detecção avançada
    try:
        print("\n5. Ativando detecção avançada...")
        response = requests.post(
            f"{base_url}/detection/toggle/{camera_id}",
            json={"enabled": True},
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ Detecção avançada ativada")
        else:
            print(f"❌ Erro ao ativar detecção: {response.status_code}")
    except Exception as e:
        print(f"❌ Erro ao ativar detecção: {e}")
    
    # 6. Testar captura de câmera
    try:
        print("\n6. Testando captura de câmera...")
        
        # Tentar capturar frame da câmera
        cap = cv2.VideoCapture(0)  # Câmera padrão
        if cap.isOpened():
            ret, frame = cap.read()
            if ret:
                print("✅ Câmera acessível e funcionando")
                
                # Salvar frame de teste
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                test_filename = f"test_frame_{timestamp}.jpg"
                cv2.imwrite(test_filename, frame)
                print(f"✅ Frame de teste salvo: {test_filename}")
            else:
                print("❌ Erro ao capturar frame")
            cap.release()
        else:
            print("❌ Erro ao abrir câmera")
    except Exception as e:
        print(f"❌ Erro no teste de câmera: {e}")
    
    # 7. Monitorar eventos por 30 segundos
    print("\n7. Monitorando eventos por 30 segundos...")
    print("   👤 Mova-se na frente da câmera para testar a detecção")
    
    start_time = time.time()
    event_count = 0
    
    while time.time() - start_time < 30:
        try:
            response = requests.get(f"{base_url}/events/", headers=headers, timeout=5)
            if response.status_code == 200:
                events = response.json()
                if len(events) > event_count:
                    new_events = events[:len(events) - event_count]
                    for event in new_events:
                        print(f"   🚨 NOVO EVENTO: {event.get('event_type')} - {event.get('description')}")
                        print(f"      Confiança: {event.get('confidence')}")
                        print(f"      Timestamp: {event.get('timestamp')}")
                    event_count = len(events)
            
            time.sleep(2)  # Verificar a cada 2 segundos
            
        except Exception as e:
            print(f"   ⚠️ Erro ao verificar eventos: {e}")
    
    # 8. Resultado final
    try:
        response = requests.get(f"{base_url}/events/", headers=headers, timeout=10)
        if response.status_code == 200:
            events = response.json()
            print(f"\n8. Resultado Final:")
            print(f"   📊 Total de eventos detectados: {len(events)}")
            
            if events:
                print("   📋 Últimos eventos:")
                for event in events[:3]:
                    print(f"      - {event.get('event_type')}: {event.get('description')}")
                    print(f"        Confiança: {event.get('confidence')}")
                    print(f"        Imagem: {event.get('image_path')}")
            else:
                print("   ℹ️ Nenhum evento detectado durante o teste")
                print("   💡 Dicas:")
                print("      - Verifique se a câmera está funcionando")
                print("      - Mova-se mais lentamente na frente da câmera")
                print("      - Verifique se as áreas de detecção estão configuradas corretamente")
        else:
            print(f"❌ Erro ao obter eventos finais: {response.status_code}")
    except Exception as e:
        print(f"❌ Erro ao obter resultado final: {e}")
    
    print("\n🎯 Teste do Sistema Avançado de Detecção concluído!")
    print("   📁 Verifique as imagens em: backend/uploads/screenshots/")
    print("   📊 Logs detalhados no console do backend")
    
    return True

def test_yolo_model():
    """Testar modelo YOLO separadamente"""
    print("\n🔍 Testando modelo YOLO...")
    
    try:
        from ultralytics import YOLO
        import cv2
        
        # Carregar modelo
        model = YOLO('models/yolov8n.pt')
        print("✅ Modelo YOLO carregado")
        
        # Testar com câmera
        cap = cv2.VideoCapture(0)
        if cap.isOpened():
            ret, frame = cap.read()
            if ret:
                # Executar detecção
                results = model(frame, conf=0.5, verbose=False)
                
                detections = 0
                for result in results:
                    if result.boxes is not None:
                        detections = len(result.boxes)
                
                print(f"✅ YOLO funcionando - {detections} objetos detectados")
            cap.release()
        else:
            print("❌ Erro ao acessar câmera para teste YOLO")
            
    except Exception as e:
        print(f"❌ Erro no teste YOLO: {e}")

if __name__ == "__main__":
    print("🛡️ SISTEMA AVANÇADO DE DETECÇÃO DE INVASORES")
    print("=" * 50)
    
    # Testar YOLO primeiro
    test_yolo_model()
    
    # Testar sistema completo
    test_advanced_detection()
