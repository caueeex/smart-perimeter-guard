#!/usr/bin/env python3
"""
Script simples para testar endpoint de câmeras
"""
import requests
import json

def test_cameras_endpoint():
    """Testar endpoint de câmeras"""
    print("🔍 Testando endpoint de câmeras...")
    
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
            print(f"   Resposta: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Erro no login: {e}")
        return False
    
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # 2. Testar endpoint de câmeras
    try:
        print("\n2. Testando endpoint de câmeras...")
        response = requests.get(f"{base_url}/cameras/", headers=headers, timeout=10)
        
        print(f"   Status: {response.status_code}")
        print(f"   Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            cameras = response.json()
            print(f"✅ {len(cameras)} câmeras encontradas")
            
            for camera in cameras:
                print(f"   - {camera.get('name')} (ID: {camera.get('id')})")
                print(f"     Status: {camera.get('status')}")
                print(f"     Detecção: {camera.get('detection_enabled')}")
                print(f"     URL: {camera.get('stream_url')}")
        else:
            print(f"❌ Erro: {response.status_code}")
            print(f"   Resposta: {response.text}")
            
            # Tentar fazer parse do JSON de erro
            try:
                error_data = response.json()
                print(f"   Erro detalhado: {error_data}")
            except:
                print("   Não foi possível fazer parse do erro como JSON")
                
    except Exception as e:
        print(f"❌ Erro ao testar câmeras: {e}")
        return False
    
    return True

if __name__ == "__main__":
    test_cameras_endpoint()
