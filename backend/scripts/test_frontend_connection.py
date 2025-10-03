#!/usr/bin/env python3
"""
Script para testar conexão do frontend com backend
"""
import requests
import json

def test_frontend_connection():
    """Testar se frontend consegue conectar com backend"""
    print("🔍 Testando conexão frontend-backend...")
    
    # 1. Testar login
    try:
        print("\n1. Testando login...")
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        
        response = requests.post("http://localhost:8000/api/v1/auth/login", data=login_data, timeout=10)
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
    
    # 2. Testar API de câmeras
    try:
        print("\n2. Testando API de câmeras...")
        response = requests.get("http://localhost:8000/api/v1/cameras/", headers=headers, timeout=10)
        if response.status_code == 200:
            cameras = response.json()
            print(f"✅ API de câmeras OK: {len(cameras)} câmeras")
            for camera in cameras:
                print(f"   - {camera.get('name')}: {camera.get('stream_url')}")
        else:
            print(f"❌ API de câmeras falhou: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Erro na API de câmeras: {e}")
        return False
    
    # 3. Testar stream
    if cameras:
        camera = cameras[0]
        camera_id = camera.get('id')
        stream_url = camera.get('stream_url')
        
        try:
            print(f"\n3. Testando stream da câmera {camera_id}...")
            
            # Iniciar stream
            response = requests.get(
                f"http://localhost:8000/api/v1/stream/start/{camera_id}",
                params={"stream_url": stream_url},
                headers=headers,
                timeout=15
            )
            if response.status_code == 200:
                print("✅ Stream iniciado")
                
                # Obter frame
                response = requests.get(f"http://localhost:8000/api/v1/stream/frame/{camera_id}", headers=headers, timeout=10)
                if response.status_code == 200:
                    frame_data = response.json()
                    print(f"✅ Frame obtido: {len(frame_data.get('frame', ''))} bytes")
                else:
                    print(f"❌ Frame falhou: {response.status_code}")
                
                # Parar stream
                requests.get(f"http://localhost:8000/api/v1/stream/stop/{camera_id}", headers=headers, timeout=10)
                print("✅ Stream parado")
            else:
                print(f"❌ Stream falhou: {response.status_code}")
                print(f"   Resposta: {response.text}")
        except Exception as e:
            print(f"❌ Erro no stream: {e}")
    
    return True

def test_cors():
    """Testar CORS"""
    print("\n4. Testando CORS...")
    
    try:
        headers = {
            "Origin": "http://localhost:8080",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization"
        }
        
        response = requests.options("http://localhost:8000/api/v1/cameras/", headers=headers, timeout=10)
        print(f"✅ CORS preflight: {response.status_code}")
        
        cors_headers = response.headers
        print(f"   Access-Control-Allow-Origin: {cors_headers.get('Access-Control-Allow-Origin', 'Não definido')}")
        print(f"   Access-Control-Allow-Methods: {cors_headers.get('Access-Control-Allow-Methods', 'Não definido')}")
        print(f"   Access-Control-Allow-Headers: {cors_headers.get('Access-Control-Allow-Headers', 'Não definido')}")
        
    except Exception as e:
        print(f"❌ Erro no CORS: {e}")

if __name__ == "__main__":
    if test_frontend_connection():
        test_cors()
        print("\n🎯 Backend funcionando! Problema pode ser no frontend.")
        print("   Verifique:")
        print("   1. Console do navegador (F12)")
        print("   2. Permissões da câmera")
        print("   3. Se o frontend está rodando na porta 8080")
    else:
        print("\n❌ Problema no backend.")
