#!/usr/bin/env python3
"""
Script para testar autenticação e criar usuário de teste
"""
import requests
import json

def create_test_user():
    """Criar usuário de teste"""
    base_url = "http://localhost:8000/api/v1"
    
    print("🔐 Testando autenticação...")
    
    # Dados do usuário de teste (usando credenciais válidas)
    user_data = {
        "username": "admin",
        "email": "admin@securevision.com",
        "password": "admin123",
        "full_name": "Administrador"
    }
    
    try:
        # Tentar registrar usuário
        print("\n1. Registrando usuário de teste...")
        response = requests.post(f"{base_url}/auth/register", json=user_data, timeout=10)
        
        if response.status_code == 201:
            print("✅ Usuário registrado com sucesso")
            return user_data
        elif response.status_code == 400:
            print("ℹ️ Usuário já existe, tentando login...")
            return user_data
        else:
            print(f"❌ Erro ao registrar: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Erro ao registrar usuário: {e}")
        return None

def login_user(user_data):
    """Fazer login do usuário"""
    base_url = "http://localhost:8000/api/v1"
    
    try:
        print("\n2. Fazendo login...")
        login_data = {
            "username": user_data["username"],
            "password": user_data["password"]
        }
        
        print(f"Tentando login com: {login_data}")
        
        response = requests.post(f"{base_url}/auth/login", data=login_data, timeout=10)
        
        if response.status_code == 200:
            token_data = response.json()
            access_token = token_data.get("access_token")
            print("✅ Login realizado com sucesso")
            return access_token
        else:
            print(f"❌ Erro no login: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Erro no login: {e}")
        return None

def test_authenticated_requests(token):
    """Testar requisições autenticadas"""
    base_url = "http://localhost:8000/api/v1"
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        print("\n3. Testando requisições autenticadas...")
        
        # Testar webcam
        response = requests.get(f"{base_url}/webcam/devices", headers=headers, timeout=10)
        if response.status_code == 200:
            print("✅ Webcam devices acessível")
        else:
            print(f"❌ Webcam devices: {response.status_code}")
        
        # Testar câmeras
        response = requests.get(f"{base_url}/cameras/", headers=headers, timeout=10)
        if response.status_code == 200:
            cameras = response.json()
            print(f"✅ Câmeras acessível: {len(cameras)} encontradas")
        else:
            print(f"❌ Câmeras: {response.status_code}")
        
        # Testar stream
        camera_id = 1
        stream_url = "webcam://0"
        response = requests.get(
            f"{base_url}/stream/start/{camera_id}", 
            params={"stream_url": stream_url},
            headers=headers,
            timeout=15
        )
        if response.status_code == 200:
            print("✅ Stream iniciado com sucesso")
            
            # Testar frame
            response = requests.get(f"{base_url}/stream/frame/{camera_id}", headers=headers, timeout=10)
            if response.status_code == 200:
                frame_data = response.json()
                print(f"✅ Frame obtido: {len(frame_data.get('frame', ''))} bytes")
            else:
                print(f"❌ Frame: {response.status_code}")
                
            # Parar stream
            response = requests.get(f"{base_url}/stream/stop/{camera_id}", headers=headers, timeout=10)
            if response.status_code == 200:
                print("✅ Stream parado com sucesso")
            else:
                print(f"❌ Parar stream: {response.status_code}")
        else:
            print(f"❌ Stream: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Erro nas requisições autenticadas: {e}")

if __name__ == "__main__":
    # Criar usuário de teste
    user_data = create_test_user()
    if not user_data:
        exit(1)
    
    # Fazer login
    token = login_user(user_data)
    if not token:
        exit(1)
    
    # Testar requisições autenticadas
    test_authenticated_requests(token)
    
    print("\n🎯 Teste de autenticação concluído!")
