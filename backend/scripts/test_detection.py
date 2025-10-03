#!/usr/bin/env python3
"""
Script para testar a detecção de invasores
"""
import requests
import json
import time

def test_detection_system():
    """Testar sistema de detecção"""
    print("🔍 Testando sistema de detecção de invasores...")
    
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
    
    # 3. Configurar linha de detecção
    try:
        print("\n3. Configurando linha de detecção...")
        line_config = {
            "start_x": 100,
            "start_y": 200,
            "end_x": 300,
            "end_y": 200,
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
            print(f"   Resposta: {response.text}")
    except Exception as e:
        print(f"❌ Erro ao configurar linha: {e}")
    
    # 4. Configurar zona de detecção
    try:
        print("\n4. Configurando zona de detecção...")
        zone_config = {
            "points": [
                {"x": 150, "y": 150},
                {"x": 250, "y": 150},
                {"x": 250, "y": 250},
                {"x": 150, "y": 250}
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
            print(f"   Resposta: {response.text}")
    except Exception as e:
        print(f"❌ Erro ao configurar zona: {e}")
    
    # 5. Obter configuração de detecção
    try:
        print("\n5. Obtendo configuração de detecção...")
        response = requests.get(
            f"{base_url}/detection/config/{camera_id}",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            config = response.json()
            print("✅ Configuração obtida:")
            print(f"   Detecção ativa: {config.get('detection_enabled')}")
            print(f"   Sensibilidade: {config.get('sensitivity')}%")
            print(f"   Linha configurada: {config.get('detection_line') is not None}")
            print(f"   Zona configurada: {config.get('detection_zone') is not None}")
        else:
            print(f"❌ Erro ao obter configuração: {response.status_code}")
    except Exception as e:
        print(f"❌ Erro ao obter configuração: {e}")
    
    # 6. Ativar detecção
    try:
        print("\n6. Ativando detecção...")
        response = requests.post(
            f"{base_url}/detection/toggle/{camera_id}",
            json={"enabled": True},
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ Detecção ativada")
        else:
            print(f"❌ Erro ao ativar detecção: {response.status_code}")
    except Exception as e:
        print(f"❌ Erro ao ativar detecção: {e}")
    
    # 7. Verificar eventos
    try:
        print("\n7. Verificando eventos...")
        response = requests.get(f"{base_url}/events/", headers=headers, timeout=10)
        
        if response.status_code == 200:
            events = response.json()
            print(f"✅ {len(events)} eventos encontrados")
            
            # Mostrar últimos 3 eventos
            for event in events[:3]:
                print(f"   - {event.get('event_type')}: {event.get('description')} ({event.get('timestamp')})")
        else:
            print(f"❌ Erro ao obter eventos: {response.status_code}")
    except Exception as e:
        print(f"❌ Erro ao obter eventos: {e}")
    
    print("\n🎯 Sistema de detecção testado!")
    print("   Para testar a detecção:")
    print("   1. Mova-se na frente da câmera")
    print("   2. Verifique se eventos são criados")
    print("   3. Confira as imagens em backend/uploads/screenshots/")
    
    return True

if __name__ == "__main__":
    test_detection_system()
