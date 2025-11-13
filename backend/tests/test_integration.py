#!/usr/bin/env python3
"""
Teste de Integração - Verificação de comunicação e funcionamento conjunto
entre diferentes módulos e serviços do sistema SecureVision

Este teste verifica:
1. Autenticação e autorização
2. Criação e gerenciamento de câmeras
3. Criação e gerenciamento de eventos
4. Comunicação entre serviços (CameraService, EventService, DetectionService)
5. Integridade referencial (Foreign Keys)
6. Deletar câmera com eventos relacionados
7. API endpoints e respostas
"""
import os
import sys
import requests
import json
import time
from datetime import datetime
from typing import Dict, Optional

# Adicionar o diretório backend ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from database import SessionLocal
from models.camera import Camera
from models.event import Event, EventType
from services.camera_service import CameraService
from services.event_service import EventService
from schemas.event import EventCreate

# Configurações
BASE_URL = "http://localhost:8000/api/v1"
TEST_USERNAME = "admin"
TEST_PASSWORD = "admin123"


class Colors:
    """Cores para output do terminal"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


class IntegrationTest:
    """Classe principal para testes de integração"""
    
    def __init__(self):
        self.access_token: Optional[str] = None
        self.headers: Dict[str, str] = {}
        self.created_cameras: list = []
        self.created_events: list = []
        self.test_results: list = []
        
    def log(self, message: str, status: str = "INFO"):
        """Log formatado"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        if status == "PASS":
            print(f"{Colors.GREEN}✓{Colors.RESET} [{timestamp}] {message}")
        elif status == "FAIL":
            print(f"{Colors.RED}✗{Colors.RESET} [{timestamp}] {message}")
        elif status == "INFO":
            print(f"{Colors.BLUE}ℹ{Colors.RESET} [{timestamp}] {message}")
        elif status == "WARN":
            print(f"{Colors.YELLOW}⚠{Colors.RESET} [{timestamp}] {message}")
        else:
            print(f"[{timestamp}] {message}")
    
    def test_result(self, test_name: str, passed: bool, details: str = ""):
        """Registrar resultado do teste"""
        self.test_results.append({
            "test": test_name,
            "passed": passed,
            "details": details
        })
        if passed:
            self.log(f"{test_name}: PASSOU", "PASS")
        else:
            self.log(f"{test_name}: FALHOU - {details}", "FAIL")
    
    def test_authentication(self) -> bool:
        """Teste 1: Autenticação e obtenção de token"""
        self.log("=" * 60)
        self.log("TESTE 1: Autenticação e Autorização", "INFO")
        self.log("=" * 60)
        
        try:
            # Login
            login_data = {
                "username": TEST_USERNAME,
                "password": TEST_PASSWORD
            }
            
            response = requests.post(
                f"{BASE_URL}/auth/login",
                data=login_data,
                timeout=10
            )
            
            if response.status_code != 200:
                self.test_result(
                    "Autenticação - Login",
                    False,
                    f"Status {response.status_code}: {response.text}"
                )
                return False
            
            token_data = response.json()
            self.access_token = token_data.get("access_token")
            
            if not self.access_token:
                self.test_result(
                    "Autenticação - Token",
                    False,
                    "Token não retornado"
                )
                return False
            
            self.headers = {"Authorization": f"Bearer {self.access_token}"}
            self.test_result("Autenticação - Login", True)
            self.test_result("Autenticação - Token", True)
            return True
            
        except Exception as e:
            self.test_result("Autenticação", False, str(e))
            return False
    
    def test_camera_creation(self) -> Optional[int]:
        """Teste 2: Criação de câmera via API e Serviço"""
        self.log("=" * 60)
        self.log("TESTE 2: Criação de Câmera", "INFO")
        self.log("=" * 60)
        
        try:
            # Teste via API
            camera_data = {
                "name": f"Test Camera Integration {int(time.time())}",
                "location": "Test Location",
                "stream_url": "rtsp://test.stream.url",
                "zone": "Test Zone",
                "detection_enabled": True,
                "sensitivity": 50,
                "fps": 15,
                "resolution": "640x480"
            }
            
            response = requests.post(
                f"{BASE_URL}/cameras/",
                json=camera_data,
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code != 201:
                self.test_result(
                    "Criação de Câmera - API",
                    False,
                    f"Status {response.status_code}: {response.text}"
                )
                return None
            
            camera_api = response.json()
            camera_id = camera_api.get("id")
            
            if not camera_id:
                self.test_result(
                    "Criação de Câmera - ID",
                    False,
                    "ID não retornado"
                )
                return None
            
            self.created_cameras.append(camera_id)
            self.test_result("Criação de Câmera - API", True)
            
            # Verificar no banco de dados diretamente
            db = SessionLocal()
            try:
                db_camera = CameraService.get_camera(db, camera_id)
                if not db_camera:
                    self.test_result(
                        "Criação de Câmera - Banco de Dados",
                        False,
                        "Câmera não encontrada no banco"
                    )
                    return None
                
                if db_camera.name != camera_data["name"]:
                    self.test_result(
                        "Criação de Câmera - Dados",
                        False,
                        f"Nome não corresponde: {db_camera.name} != {camera_data['name']}"
                    )
                    return None
                
                self.test_result("Criação de Câmera - Banco de Dados", True)
                self.test_result("Criação de Câmera - Dados", True)
                
            finally:
                db.close()
            
            return camera_id
            
        except Exception as e:
            self.test_result("Criação de Câmera", False, str(e))
            return None
    
    def test_event_creation(self, camera_id: int) -> bool:
        """Teste 3: Criação de eventos relacionados à câmera"""
        self.log("=" * 60)
        self.log("TESTE 3: Criação de Eventos", "INFO")
        self.log("=" * 60)
        
        try:
            db = SessionLocal()
            try:
                # Criar eventos via serviço
                event1_data = EventCreate(
                    camera_id=camera_id,
                    event_type=EventType.INTRUSION,
                    description="Teste de intrusão - Integração",
                    confidence=0.85
                )
                
                event2_data = EventCreate(
                    camera_id=camera_id,
                    event_type=EventType.MOVEMENT,
                    description="Teste de movimento - Integração",
                    confidence=0.75
                )
                
                event1 = EventService.create_event(db, event1_data)
                event2 = EventService.create_event(db, event2_data)
                
                if not event1 or not event2:
                    self.test_result(
                        "Criação de Eventos - Serviço",
                        False,
                        "Eventos não criados"
                    )
                    return False
                
                self.created_events.extend([event1.id, event2.id])
                self.test_result("Criação de Eventos - Serviço", True)
                
                # Verificar eventos no banco
                events = EventService.get_events_by_camera(db, camera_id)
                if len(events) < 2:
                    self.test_result(
                        "Criação de Eventos - Banco de Dados",
                        False,
                        f"Esperado 2 eventos, encontrado {len(events)}"
                    )
                    return False
                
                self.test_result("Criação de Eventos - Banco de Dados", True)
                
                # Verificar Foreign Key
                for event in events:
                    if event.camera_id != camera_id:
                        self.test_result(
                            "Criação de Eventos - Foreign Key",
                            False,
                            f"camera_id incorreto: {event.camera_id} != {camera_id}"
                        )
                        return False
                
                self.test_result("Criação de Eventos - Foreign Key", True)
                
            finally:
                db.close()
            
            return True
            
        except Exception as e:
            self.test_result("Criação de Eventos", False, str(e))
            return False
    
    def test_camera_event_relationship(self, camera_id: int) -> bool:
        """Teste 4: Verificar relacionamento entre câmera e eventos"""
        self.log("=" * 60)
        self.log("TESTE 4: Relacionamento Câmera-Eventos", "INFO")
        self.log("=" * 60)
        
        try:
            db = SessionLocal()
            try:
                # Buscar câmera
                camera = CameraService.get_camera(db, camera_id)
                if not camera:
                    self.test_result(
                        "Relacionamento - Câmera",
                        False,
                        "Câmera não encontrada"
                    )
                    return False
                
                # Buscar eventos da câmera
                events = EventService.get_events_by_camera(db, camera_id)
                
                if len(events) == 0:
                    self.test_result(
                        "Relacionamento - Eventos",
                        False,
                        "Nenhum evento encontrado"
                    )
                    return False
                
                # Verificar integridade referencial
                for event in events:
                    db_event = EventService.get_event(db, event.id)
                    if not db_event:
                        self.test_result(
                            "Relacionamento - Integridade",
                            False,
                            f"Evento {event.id} não encontrado"
                        )
                        return False
                    
                    if db_event.camera_id != camera_id:
                        self.test_result(
                            "Relacionamento - Integridade",
                            False,
                            f"camera_id incorreto no evento {event.id}"
                        )
                        return False
                
                self.test_result("Relacionamento - Câmera", True)
                self.test_result("Relacionamento - Eventos", True)
                self.test_result("Relacionamento - Integridade", True)
                
            finally:
                db.close()
            
            return True
            
        except Exception as e:
            self.test_result("Relacionamento Câmera-Eventos", False, str(e))
            return False
    
    def test_camera_deletion_with_events(self, camera_id: int) -> bool:
        """Teste 5: Deletar câmera com eventos relacionados"""
        self.log("=" * 60)
        self.log("TESTE 5: Deletar Câmera com Eventos", "INFO")
        self.log("=" * 60)
        
        try:
            db = SessionLocal()
            try:
                # Verificar eventos antes da deleção
                events_before = EventService.get_events_by_camera(db, camera_id)
                events_count_before = len(events_before)
                
                self.log(f"Eventos antes da deleção: {events_count_before}", "INFO")
                
                # Deletar câmera via serviço
                success = CameraService.delete_camera(db, camera_id)
                
                if not success:
                    self.test_result(
                        "Deletar Câmera - Serviço",
                        False,
                        "Método retornou False"
                    )
                    return False
                
                self.test_result("Deletar Câmera - Serviço", True)
                
                # Verificar se câmera foi deletada
                camera_after = CameraService.get_camera(db, camera_id)
                if camera_after:
                    self.test_result(
                        "Deletar Câmera - Banco de Dados",
                        False,
                        "Câmera ainda existe no banco"
                    )
                    return False
                
                self.test_result("Deletar Câmera - Banco de Dados", True)
                
                # Verificar se eventos foram deletados
                events_after = db.query(Event).filter(Event.camera_id == camera_id).all()
                events_count_after = len(events_after)
                
                if events_count_after > 0:
                    self.test_result(
                        "Deletar Câmera - Eventos",
                        False,
                        f"{events_count_after} eventos ainda existem"
                    )
                    return False
                
                self.test_result(
                    "Deletar Câmera - Eventos",
                    True,
                    f"{events_count_before} eventos deletados corretamente"
                )
                
                # Remover da lista de câmeras criadas
                if camera_id in self.created_cameras:
                    self.created_cameras.remove(camera_id)
                
            finally:
                db.close()
            
            return True
            
        except Exception as e:
            self.test_result("Deletar Câmera com Eventos", False, str(e))
            import traceback
            self.log(f"Traceback: {traceback.format_exc()}", "FAIL")
            return False
    
    def test_api_endpoints(self) -> bool:
        """Teste 6: Verificar endpoints da API"""
        self.log("=" * 60)
        self.log("TESTE 6: Endpoints da API", "INFO")
        self.log("=" * 60)
        
        try:
            # Testar GET /cameras/
            response = requests.get(
                f"{BASE_URL}/cameras/",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code != 200:
                self.test_result(
                    "API - GET /cameras/",
                    False,
                    f"Status {response.status_code}"
                )
                return False
            
            cameras = response.json()
            self.test_result("API - GET /cameras/", True, f"{len(cameras)} câmeras")
            
            # Testar GET /events/
            response = requests.get(
                f"{BASE_URL}/events/",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code != 200:
                self.test_result(
                    "API - GET /events/",
                    False,
                    f"Status {response.status_code}"
                )
                return False
            
            events = response.json()
            self.test_result("API - GET /events/", True, f"{len(events)} eventos")
            
            # Testar GET /cameras/stats/summary
            response = requests.get(
                f"{BASE_URL}/cameras/stats/summary",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code != 200:
                self.test_result(
                    "API - GET /cameras/stats/summary",
                    False,
                    f"Status {response.status_code}"
                )
                return False
            
            stats = response.json()
            self.test_result(
                "API - GET /cameras/stats/summary",
                True,
                f"Total: {stats.get('total_cameras', 0)}"
            )
            
            return True
            
        except Exception as e:
            self.test_result("Endpoints da API", False, str(e))
            return False
    
    def cleanup(self):
        """Limpar recursos criados durante os testes"""
        self.log("=" * 60)
        self.log("Limpeza de Recursos", "INFO")
        self.log("=" * 60)
        
        db = SessionLocal()
        try:
            # Deletar câmeras restantes
            for camera_id in self.created_cameras[:]:
                try:
                    CameraService.delete_camera(db, camera_id)
                    self.log(f"Câmera {camera_id} deletada", "INFO")
                except Exception as e:
                    self.log(f"Erro ao deletar câmera {camera_id}: {e}", "WARN")
            
            # Deletar eventos restantes
            for event_id in self.created_events[:]:
                try:
                    EventService.delete_event(db, event_id)
                    self.log(f"Evento {event_id} deletado", "INFO")
                except Exception as e:
                    self.log(f"Erro ao deletar evento {event_id}: {e}", "WARN")
                    
        finally:
            db.close()
    
    def run_all_tests(self):
        """Executar todos os testes de integração"""
        self.log("=" * 60)
        self.log(f"{Colors.BOLD}INICIANDO TESTES DE INTEGRAÇÃO{Colors.RESET}", "INFO")
        self.log("=" * 60)
        self.log(f"Data/Hora: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", "INFO")
        self.log(f"Base URL: {BASE_URL}", "INFO")
        self.log("", "INFO")
        
        camera_id = None
        
        try:
            # Teste 1: Autenticação
            if not self.test_authentication():
                self.log("Testes interrompidos: Falha na autenticação", "FAIL")
                return
            
            # Teste 2: Criação de câmera
            camera_id = self.test_camera_creation()
            if not camera_id:
                self.log("Testes interrompidos: Falha na criação de câmera", "FAIL")
                return
            
            # Teste 3: Criação de eventos
            if not self.test_event_creation(camera_id):
                self.log("Testes interrompidos: Falha na criação de eventos", "FAIL")
                return
            
            # Teste 4: Relacionamento câmera-eventos
            if not self.test_camera_event_relationship(camera_id):
                self.log("Testes interrompidos: Falha no relacionamento", "FAIL")
                return
            
            # Teste 5: Deletar câmera com eventos
            if not self.test_camera_deletion_with_events(camera_id):
                self.log("Testes interrompidos: Falha na deleção", "FAIL")
                return
            
            # Teste 6: Endpoints da API
            self.test_api_endpoints()
            
        except Exception as e:
            self.log(f"Erro crítico durante os testes: {e}", "FAIL")
            import traceback
            self.log(f"Traceback: {traceback.format_exc()}", "FAIL")
        
        finally:
            # Limpeza
            self.cleanup()
            
            # Relatório final
            self.print_summary()
    
    def print_summary(self):
        """Imprimir resumo dos testes"""
        self.log("", "INFO")
        self.log("=" * 60)
        self.log(f"{Colors.BOLD}RESUMO DOS TESTES{Colors.RESET}", "INFO")
        self.log("=" * 60)
        
        total = len(self.test_results)
        passed = sum(1 for r in self.test_results if r["passed"])
        failed = total - passed
        
        self.log(f"Total de testes: {total}", "INFO")
        self.log(f"{Colors.GREEN}Passou: {passed}{Colors.RESET}", "PASS" if passed > 0 else "INFO")
        self.log(f"{Colors.RED}Falhou: {failed}{Colors.RESET}", "FAIL" if failed > 0 else "INFO")
        
        if failed > 0:
            self.log("", "INFO")
            self.log("Testes que falharam:", "FAIL")
            for result in self.test_results:
                if not result["passed"]:
                    self.log(f"  - {result['test']}: {result['details']}", "FAIL")
        
        self.log("=" * 60)
        
        if failed == 0:
            self.log(f"{Colors.GREEN}{Colors.BOLD}TODOS OS TESTES PASSARAM!{Colors.RESET}", "PASS")
        else:
            self.log(f"{Colors.RED}{Colors.BOLD}ALGUNS TESTES FALHARAM{Colors.RESET}", "FAIL")


def main():
    """Função principal"""
    tester = IntegrationTest()
    tester.run_all_tests()


if __name__ == "__main__":
    main()

