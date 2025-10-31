"""
Script de diagnóstico do sistema de detecção de invasores
"""
import sys
import os

# Adicionar diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models.camera import Camera
from services.detection_service import detection_service
import cv2
from datetime import datetime


def check_yolo_model():
    """Verificar se modelo YOLO está carregado"""
    print("\n" + "="*60)
    print("1. VERIFICANDO MODELO YOLO")
    print("="*60)
    
    if detection_service.is_model_loaded():
        print("✅ Modelo YOLO está carregado")
        print(f"   Tipo: {type(detection_service.model)}")
        return True
    else:
        print("❌ Modelo YOLO NÃO está carregado!")
        print("   Possíveis causas:")
        print("   - Arquivo yolov8n.pt não encontrado")
        print("   - Erro ao carregar modelo")
        print("   - Dependências faltando (torch, ultralytics)")
        return False


def check_cameras():
    """Verificar câmeras cadastradas"""
    print("\n" + "="*60)
    print("2. VERIFICANDO CÂMERAS CADASTRADAS")
    print("="*60)
    
    db = SessionLocal()
    try:
        cameras = db.query(Camera).all()
        
        if not cameras:
            print("⚠️ Nenhuma câmera cadastrada")
            return []
        
        print(f"✅ {len(cameras)} câmera(s) encontrada(s):\n")
        
        for cam in cameras:
            print(f"   📹 ID: {cam.id} - {cam.name}")
            print(f"      URL: {cam.stream_url}")
            print(f"      Detecção: {'✅ Ativada' if cam.detection_enabled else '❌ Desativada'}")
            print(f"      Sensibilidade: {cam.sensitivity}%")
            print(f"      Linha configurada: {'✅ Sim' if cam.detection_line else '❌ Não'}")
            print(f"      Zona configurada: {'✅ Sim' if cam.detection_zone else '❌ Não'}")
            print()
        
        return cameras
    finally:
        db.close()


def check_active_monitors():
    """Verificar monitoramentos ativos"""
    print("\n" + "="*60)
    print("3. VERIFICANDO MONITORAMENTOS ATIVOS")
    print("="*60)
    
    active = detection_service.active_monitors
    if not active:
        print("⚠️ Nenhum monitoramento ativo")
        return
    
    print(f"✅ {len(active)} monitoramento(s) ativo(s):\n")
    
    for camera_id, is_active in active.items():
        status = "✅ ATIVO" if is_active else "❌ INATIVO"
        print(f"   📹 Câmera ID {camera_id}: {status}")
        
        # Verificar tracking data
        if camera_id in detection_service.tracking_data:
            tracking = detection_service.tracking_data[camera_id]
            print(f"      Objetos rastreados: {len(tracking.get('objects', {}))}")
            print(f"      Frame count: {tracking.get('frame_count', 0)}")


def test_camera_connection(camera_id: int, stream_url: str):
    """Testar conexão com câmera"""
    print(f"\n   🔍 Testando conexão com câmera {camera_id}...")
    
    cap = None
    try:
        if stream_url.startswith("webcam://"):
            camera_index = int(stream_url.split("://")[1])
            cap = cv2.VideoCapture(camera_index)
        else:
            cap = cv2.VideoCapture(stream_url)
        
        if not cap.isOpened():
            print(f"      ❌ Não foi possível conectar à câmera")
            return False
        
        ret, frame = cap.read()
        if not ret:
            print(f"      ❌ Não foi possível ler frame")
            return False
        
        print(f"      ✅ Conexão OK - Frame capturado: {frame.shape}")
        return True
        
    except Exception as e:
        print(f"      ❌ Erro: {e}")
        return False
    finally:
        if cap:
            cap.release()


def test_detection_on_camera(camera_id: int):
    """Testar detecção em uma câmera específica"""
    print(f"\n   🤖 Testando detecção na câmera {camera_id}...")
    
    db = SessionLocal()
    try:
        camera = db.query(Camera).filter(Camera.id == camera_id).first()
        if not camera:
            print(f"      ❌ Câmera {camera_id} não encontrada")
            return False
        
        # Tentar capturar frame
        cap = None
        try:
            if camera.stream_url.startswith("webcam://"):
                camera_index = int(camera.stream_url.split("://")[1])
                cap = cv2.VideoCapture(camera_index)
            else:
                cap = cv2.VideoCapture(camera.stream_url)
            
            if not cap.isOpened():
                print(f"      ❌ Não foi possível conectar à câmera")
                return False
            
            ret, frame = cap.read()
            if not ret:
                print(f"      ❌ Não foi possível ler frame")
                return False
            
            # Testar YOLO
            sensitivity = camera.sensitivity / 100.0
            objects = detection_service._detect_objects_yolo(frame, sensitivity)
            
            print(f"      ✅ Frame processado")
            print(f"      🎯 Objetos detectados: {len(objects)}")
            
            if objects:
                for obj in objects:
                    print(f"         - {obj['class']}: confiança={obj['confidence']:.2f}, área={obj['area']}")
            else:
                print(f"      ⚠️ Nenhum objeto detectado")
                print(f"      Possíveis causas:")
                print(f"         - Nenhum objeto relevante na cena")
                print(f"         - Sensibilidade muito alta ({sensitivity:.2f})")
                print(f"         - Modelo YOLO com problema")
            
            return len(objects) > 0
            
        finally:
            if cap:
                cap.release()
                
    finally:
        db.close()


def run_full_diagnostics():
    """Executar diagnóstico completo"""
    print("\n" + "="*60)
    print("🔍 DIAGNÓSTICO DO SISTEMA DE DETECÇÃO DE INVASORES")
    print("="*60)
    
    # 1. Verificar modelo YOLO
    model_loaded = check_yolo_model()
    
    if not model_loaded:
        print("\n❌ DIAGNÓSTICO: Sistema não pode funcionar sem modelo YOLO!")
        print("   Ação: Verifique se o arquivo yolov8n.pt existe e pode ser carregado")
        return
    
    # 2. Verificar câmeras
    cameras = check_cameras()
    
    if not cameras:
        print("\n⚠️ DIAGNÓSTICO: Não há câmeras cadastradas")
        print("   Ação: Adicione pelo menos uma câmera via interface ou API")
        return
    
    # 3. Verificar monitoramentos ativos
    check_active_monitors()
    
    # 4. Testar câmeras
    print("\n" + "="*60)
    print("4. TESTANDO CÂMERAS")
    print("="*60)
    
    cameras_with_detection = [c for c in cameras if c.detection_enabled]
    
    if not cameras_with_detection:
        print("⚠️ Nenhuma câmera com detecção ativada")
    else:
        print(f"\n🧪 Testando {len(cameras_with_detection)} câmera(s) com detecção ativada:\n")
        
        for camera in cameras_with_detection:
            print(f"📹 Câmera {camera.id} - {camera.name}")
            
            # Testar conexão
            connection_ok = test_camera_connection(camera.id, camera.stream_url)
            
            if connection_ok:
                # Testar detecção
                test_detection_on_camera(camera.id)
            
            print()
    
    # Resumo final
    print("\n" + "="*60)
    print("📊 RESUMO DO DIAGNÓSTICO")
    print("="*60)
    print(f"✅ Modelo YOLO: {'Carregado' if model_loaded else 'Não carregado'}")
    print(f"📹 Câmeras cadastradas: {len(cameras)}")
    print(f"🔍 Câmeras com detecção: {len(cameras_with_detection)}")
    print(f"⚙️  Monitoramentos ativos: {len(detection_service.active_monitors)}")
    print("\n✅ Diagnóstico completo!")


if __name__ == "__main__":
    try:
        run_full_diagnostics()
    except KeyboardInterrupt:
        print("\n\n⚠️ Diagnóstico interrompido pelo usuário")
    except Exception as e:
        print(f"\n\n❌ Erro durante diagnóstico: {e}")
        import traceback
        traceback.print_exc()

