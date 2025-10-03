#!/usr/bin/env python3
"""
Script para testar stream da câmera cadastrada
"""
import requests
import json

def test_camera_stream():
    """Testar stream da câmera cadastrada"""
    base_url = "http://localhost:8000/api/v1"
    
    print("🧪 Testando stream da câmera cadastrada...")
    
    # 1. Fazer login
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
            print("✅ Login realizado com sucesso")
        else:
            print(f"❌ Erro no login: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Erro no login: {e}")
        return False
    
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # 2. Verificar câmeras
    try:
        print("\n2. Verificando câmeras...")
        response = requests.get(f"{base_url}/cameras/", headers=headers, timeout=10)
        if response.status_code == 200:
            cameras = response.json()
            print(f"✅ Câmeras encontradas: {len(cameras)}")
            for camera in cameras:
                print(f"   - {camera.get('name', 'N/A')}: {camera.get('stream_url', 'N/A')}")
        else:
            print(f"❌ Erro ao obter câmeras: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Erro ao verificar câmeras: {e}")
        return False
    
    # 3. Testar stream da primeira câmera
    if cameras:
        camera = cameras[0]
        camera_id = camera.get('id')
        stream_url = camera.get('stream_url')
        
        try:
            print(f"\n3. Testando stream da câmera {camera_id}...")
            print(f"   URL: {stream_url}")
            
            # Iniciar stream
            response = requests.get(
                f"{base_url}/stream/start/{camera_id}", 
                params={"stream_url": stream_url},
                headers=headers,
                timeout=15
            )
            if response.status_code == 200:
                print("✅ Stream iniciado com sucesso")
                
                # Aguardar um pouco
                import time
                time.sleep(3)
                
                # Obter frame
                response = requests.get(f"{base_url}/stream/frame/{camera_id}", headers=headers, timeout=10)
                if response.status_code == 200:
                    frame_data = response.json()
                    frame_size = len(frame_data.get('frame', ''))
                    print(f"✅ Frame obtido: {frame_size} bytes")
                    
                    if frame_size > 0:
                        print("🎉 Stream funcionando perfeitamente!")
                        return True
                    else:
                        print("❌ Frame vazio")
                else:
                    print(f"❌ Erro ao obter frame: {response.status_code}")
                    print(f"   Resposta: {response.text}")
                
                # Parar stream
                response = requests.get(f"{base_url}/stream/stop/{camera_id}", headers=headers, timeout=10)
                if response.status_code == 200:
                    print("✅ Stream parado com sucesso")
                else:
                    print(f"❌ Erro ao parar stream: {response.status_code}")
                    
            else:
                print(f"❌ Erro ao iniciar stream: {response.status_code}")
                print(f"   Resposta: {response.text}")
                
        except Exception as e:
            print(f"❌ Erro ao testar stream: {e}")
    
    return False

if __name__ == "__main__":
    success = test_camera_stream()
    if success:
        print("\n🎯 Stream da câmera funcionando! O problema pode ser no frontend.")
        print("   Verifique se o componente LiveStream está carregando corretamente.")
    else:
        print("\n❌ Problema no stream da câmera.")
        print("   Verifique se o stream service está funcionando.")
