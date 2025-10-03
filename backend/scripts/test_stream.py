#!/usr/bin/env python3
"""
Script para testar o sistema de streaming
"""
import requests
import time
import json

def test_stream_api():
    """Testar API de streaming"""
    base_url = "http://localhost:8000/api/v1"
    
    print("🧪 Testando API de Streaming...")
    
    # Testar endpoint de webcam
    try:
        print("\n1. Testando endpoint de webcam...")
        response = requests.get(f"{base_url}/webcam/devices", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Webcam devices: {json.dumps(data, indent=2)}")
        else:
            print(f"❌ Erro webcam: {response.status_code}")
    except Exception as e:
        print(f"❌ Erro ao testar webcam: {e}")
    
    # Testar stream service
    try:
        print("\n2. Testando stream service...")
        camera_id = 1
        stream_url = "webcam://0"
        
        # Iniciar stream
        response = requests.get(f"{base_url}/stream/start/{camera_id}", 
                              params={"stream_url": stream_url}, timeout=10)
        if response.status_code == 200:
            print(f"✅ Stream iniciado: {response.json()}")
            
            # Aguardar um pouco
            time.sleep(2)
            
            # Obter frame
            response = requests.get(f"{base_url}/stream/frame/{camera_id}", timeout=10)
            if response.status_code == 200:
                frame_data = response.json()
                print(f"✅ Frame obtido: {len(frame_data.get('frame', ''))} bytes")
            else:
                print(f"❌ Erro ao obter frame: {response.status_code}")
            
            # Parar stream
            response = requests.get(f"{base_url}/stream/stop/{camera_id}", timeout=10)
            if response.status_code == 200:
                print(f"✅ Stream parado: {response.json()}")
            else:
                print(f"❌ Erro ao parar stream: {response.status_code}")
                
        else:
            print(f"❌ Erro ao iniciar stream: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erro ao testar stream: {e}")
    
    # Testar cameras
    try:
        print("\n3. Testando endpoint de câmeras...")
        response = requests.get(f"{base_url}/cameras/", timeout=10)
        if response.status_code == 200:
            cameras = response.json()
            print(f"✅ Câmeras encontradas: {len(cameras)}")
            for camera in cameras:
                print(f"  - {camera.get('name', 'N/A')}: {camera.get('stream_url', 'N/A')}")
        else:
            print(f"❌ Erro câmeras: {response.status_code}")
    except Exception as e:
        print(f"❌ Erro ao testar câmeras: {e}")

if __name__ == "__main__":
    test_stream_api()
