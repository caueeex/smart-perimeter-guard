#!/usr/bin/env python3
"""
Teste de Carga - Avaliação de Desempenho do Sistema SecureVision

Este script executa testes de carga para identificar:
- Tempo de resposta das requisições
- Taxa de requisições por segundo (RPS)
- Taxa de erros
- Gargalos de performance
- Capacidade máxima do sistema
"""
import os
import sys
import time
import requests
import requests.exceptions
import json
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import List, Dict, Optional
from dataclasses import dataclass, field
from statistics import mean, median, stdev
import csv

# Configurações
BASE_URL = "http://localhost:8000/api/v1"
TEST_USERNAME = "admin"
TEST_PASSWORD = "admin123"

# Configurações do teste
DEFAULT_USERS = 10  # Número de usuários concorrentes
DEFAULT_REQUESTS_PER_USER = 10  # Requisições por usuário
DEFAULT_RAMP_UP_TIME = 5  # Tempo para escalar usuários (segundos)


@dataclass
class RequestResult:
    """Resultado de uma requisição"""
    endpoint: str
    method: str
    status_code: int
    response_time: float
    timestamp: float
    error: Optional[str] = None
    success: bool = True


@dataclass
class LoadTestConfig:
    """Configuração do teste de carga"""
    num_users: int = DEFAULT_USERS
    requests_per_user: int = DEFAULT_REQUESTS_PER_USER
    ramp_up_time: int = DEFAULT_RAMP_UP_TIME
    endpoints: List[str] = field(default_factory=list)
    auth_endpoint: str = f"{BASE_URL}/auth/login"
    test_duration: Optional[int] = None  # Duração em segundos (None = baseado em requests)


class LoadTester:
    """Classe para execução de testes de carga"""
    
    def __init__(self, config: LoadTestConfig):
        self.config = config
        self.results: List[RequestResult] = []
        self.access_token: Optional[str] = None
        self.created_cameras: List[int] = []
        self.lock = threading.Lock()
        self.errors: List[Dict] = []
        
    def log(self, message: str):
        """Log formatado"""
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"[{timestamp}] {message}")
    
    def authenticate(self) -> bool:
        """Autenticar e obter token"""
        try:
            start_time = time.time()
            response = requests.post(
                self.config.auth_endpoint,
                data={"username": TEST_USERNAME, "password": TEST_PASSWORD},
                timeout=10
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                self.log(f"✓ Autenticação bem-sucedida ({response_time:.3f}s)")
                return True
            else:
                self.log(f"✗ Falha na autenticação: {response.status_code}")
                return False
        except Exception as e:
            self.log(f"✗ Erro na autenticação: {e}")
            return False
    
    def make_request(self, method: str, endpoint: str, **kwargs) -> RequestResult:
        """Fazer uma requisição e medir o tempo"""
        url = f"{BASE_URL}{endpoint}" if not endpoint.startswith("http") else endpoint
        headers = kwargs.get("headers", {})
        
        if self.access_token and "Authorization" not in headers:
            headers["Authorization"] = f"Bearer {self.access_token}"
        
        kwargs["headers"] = headers
        kwargs.setdefault("timeout", 30)
        
        start_time = time.time()
        timestamp = time.time()
        response = None
        error_msg = None
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, **kwargs)
            elif method.upper() == "POST":
                response = requests.post(url, **kwargs)
            elif method.upper() == "PUT":
                response = requests.put(url, **kwargs)
            elif method.upper() == "DELETE":
                response = requests.delete(url, **kwargs)
            else:
                raise ValueError(f"Método HTTP não suportado: {method}")
            
            response_time = time.time() - start_time
            success = 200 <= response.status_code < 300
            
            result = RequestResult(
                endpoint=endpoint,
                method=method,
                status_code=response.status_code if response else 0,
                response_time=response_time,
                timestamp=timestamp,
                success=success
            )
            
            if not success and response:
                try:
                    error_text = response.text[:100] if hasattr(response, 'text') else str(response)
                except:
                    error_text = "Erro ao ler resposta"
                result.error = f"Status {response.status_code}: {error_text}"
                
        except requests.exceptions.Timeout as e:
            response_time = time.time() - start_time
            error_msg = f"Timeout: {str(e)}"
            result = RequestResult(
                endpoint=endpoint,
                method=method,
                status_code=0,
                response_time=response_time,
                timestamp=timestamp,
                error=error_msg,
                success=False
            )
        except requests.exceptions.ConnectionError as e:
            response_time = time.time() - start_time
            error_msg = f"Connection Error: {str(e)}"
            result = RequestResult(
                endpoint=endpoint,
                method=method,
                status_code=0,
                response_time=response_time,
                timestamp=timestamp,
                error=error_msg,
                success=False
            )
        except Exception as e:
            response_time = time.time() - start_time
            error_msg = f"Exception: {str(e)}"
            result = RequestResult(
                endpoint=endpoint,
                method=method,
                status_code=0,
                response_time=response_time,
                timestamp=timestamp,
                error=error_msg,
                success=False
            )
        
        with self.lock:
            self.results.append(result)
            if not result.success:
                self.errors.append({
                    "endpoint": endpoint,
                    "method": method,
                    "error": result.error or error_msg or "Unknown error",
                    "time": datetime.fromtimestamp(timestamp).isoformat()
                })
        
        return result
    
    def test_get_cameras(self) -> RequestResult:
        """Teste: GET /cameras/"""
        return self.make_request("GET", "/cameras/")
    
    def test_get_camera_stats(self) -> RequestResult:
        """Teste: GET /cameras/stats/summary"""
        return self.make_request("GET", "/cameras/stats/summary")
    
    def test_get_events(self) -> RequestResult:
        """Teste: GET /events/"""
        return self.make_request("GET", "/events/")
    
    def test_create_camera(self, camera_num: int) -> RequestResult:
        """Teste: POST /cameras/"""
        camera_data = {
            "name": f"Load Test Camera {camera_num} {int(time.time())}",
            "location": "Load Test",
            "stream_url": "rtsp://test.load.url",
            "zone": "Load Zone",
            "detection_enabled": False,
            "sensitivity": 50,
            "fps": 15,
            "resolution": "640x480"
        }
        
        result = self.make_request("POST", "/cameras/", json=camera_data)
        return result
    
    def test_get_camera(self, camera_id: int) -> RequestResult:
        """Teste: GET /cameras/{id}"""
        return self.make_request("GET", f"/cameras/{camera_id}")
    
    def user_simulation(self, user_id: int):
        """Simular comportamento de um usuário"""
        results = []
        
        for req_num in range(self.config.requests_per_user):
            # Distribuir requisições entre diferentes endpoints
            endpoint_type = req_num % 4
            
            if endpoint_type == 0:
                result = self.test_get_cameras()
            elif endpoint_type == 1:
                result = self.test_get_camera_stats()
            elif endpoint_type == 2:
                result = self.test_get_events()
            elif endpoint_type == 3:
                # Criar câmera ocasionalmente
                if req_num % 3 == 0:
                    result = self.test_create_camera(user_id * 1000 + req_num)
                else:
                    result = self.test_get_cameras()
            
            results.append(result)
            
            # Pequeno delay entre requisições
            time.sleep(0.1)
        
        return results
    
    def run_test(self):
        """Executar teste de carga"""
        self.log("=" * 70)
        self.log("INICIANDO TESTE DE CARGA")
        self.log("=" * 70)
        self.log(f"Usuários concorrentes: {self.config.num_users}")
        self.log(f"Requisições por usuário: {self.config.requests_per_user}")
        self.log(f"Total de requisições: {self.config.num_users * self.config.requests_per_user}")
        self.log(f"Tempo de ramp-up: {self.config.ramp_up_time}s")
        self.log("")
        
        # Autenticar primeiro
        self.log("Autenticando...")
        if not self.authenticate():
            self.log("ERRO: Falha na autenticação. Abortando teste.")
            return
        
        self.log("")
        self.log("Iniciando teste de carga...")
        start_time = time.time()
        
        # Executar testes com ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=self.config.num_users) as executor:
            # Ramp-up gradual
            futures = []
            for user_id in range(self.config.num_users):
                delay = (self.config.ramp_up_time / self.config.num_users) * user_id
                time.sleep(delay)
                future = executor.submit(self.user_simulation, user_id)
                futures.append(future)
            
            # Aguardar conclusão
            for future in as_completed(futures):
                try:
                    future.result()
                except Exception as e:
                    self.log(f"Erro no usuário: {e}")
        
        end_time = time.time()
        total_time = end_time - start_time
        
        self.log("")
        self.log("Teste de carga concluído!")
        self.log(f"Tempo total: {total_time:.2f}s")
        self.log(f"Total de requisições: {len(self.results)}")
        
        return total_time
    
    def generate_report(self, total_time: float) -> Dict:
        """Gerar relatório dos resultados"""
        if not self.results:
            return {}
        
        # Separar resultados por endpoint
        by_endpoint: Dict[str, List[RequestResult]] = {}
        for result in self.results:
            key = f"{result.method} {result.endpoint}"
            if key not in by_endpoint:
                by_endpoint[key] = []
            by_endpoint[key].append(result)
        
        # Calcular métricas gerais
        response_times = [r.response_time for r in self.results]
        successful = [r for r in self.results if r.success]
        failed = [r for r in self.results if not r.success]
        
        total_requests = len(self.results)
        success_count = len(successful)
        fail_count = len(failed)
        success_rate = (success_count / total_requests * 100) if total_requests > 0 else 0
        
        # Métricas de tempo de resposta
        avg_response_time = mean(response_times) if response_times else 0
        median_response_time = median(response_times) if response_times else 0
        min_response_time = min(response_times) if response_times else 0
        max_response_time = max(response_times) if response_times else 0
        std_response_time = stdev(response_times) if len(response_times) > 1 else 0
        
        # Taxa de requisições por segundo
        rps = total_requests / total_time if total_time > 0 else 0
        
        # Métricas por endpoint
        endpoint_metrics = {}
        for endpoint, results in by_endpoint.items():
            endpoint_times = [r.response_time for r in results]
            endpoint_success = [r for r in results if r.success]
            
            endpoint_metrics[endpoint] = {
                "count": len(results),
                "success_count": len(endpoint_success),
                "fail_count": len(results) - len(endpoint_success),
                "success_rate": (len(endpoint_success) / len(results) * 100) if results else 0,
                "avg_response_time": mean(endpoint_times) if endpoint_times else 0,
                "median_response_time": median(endpoint_times) if endpoint_times else 0,
                "min_response_time": min(endpoint_times) if endpoint_times else 0,
                "max_response_time": max(endpoint_times) if endpoint_times else 0,
                "std_response_time": stdev(endpoint_times) if len(endpoint_times) > 1 else 0,
            }
        
        # Identificar gargalos (endpoints mais lentos)
        bottlenecks = sorted(
            endpoint_metrics.items(),
            key=lambda x: x[1]["avg_response_time"],
            reverse=True
        )[:5]
        
        # Status codes
        status_codes = {}
        for result in self.results:
            code = result.status_code
            status_codes[code] = status_codes.get(code, 0) + 1
        
        report = {
            "test_config": {
                "num_users": self.config.num_users,
                "requests_per_user": self.config.requests_per_user,
                "total_requests": total_requests,
                "ramp_up_time": self.config.ramp_up_time,
            },
            "summary": {
                "total_time": total_time,
                "total_requests": total_requests,
                "success_count": success_count,
                "fail_count": fail_count,
                "success_rate": success_rate,
                "requests_per_second": rps,
            },
            "response_time": {
                "avg": avg_response_time,
                "median": median_response_time,
                "min": min_response_time,
                "max": max_response_time,
                "std": std_response_time,
            },
            "endpoint_metrics": endpoint_metrics,
            "bottlenecks": [
                {
                    "endpoint": endpoint,
                    "avg_response_time": metrics["avg_response_time"],
                    "count": metrics["count"]
                }
                for endpoint, metrics in bottlenecks
            ],
            "status_codes": status_codes,
            "errors": self.errors[:20],  # Primeiros 20 erros
            "timestamp": datetime.now().isoformat(),
        }
        
        return report
    
    def print_report(self, report: Dict):
        """Imprimir relatório formatado"""
        print("\n" + "=" * 70)
        print("RELATÓRIO DE TESTE DE CARGA")
        print("=" * 70)
        
        # Configuração do teste
        print("\n📋 CONFIGURAÇÃO DO TESTE")
        print("-" * 70)
        config = report["test_config"]
        print(f"  Usuários concorrentes: {config['num_users']}")
        print(f"  Requisições por usuário: {config['requests_per_user']}")
        print(f"  Total de requisições: {config['total_requests']}")
        print(f"  Tempo de ramp-up: {config['ramp_up_time']}s")
        
        # Resumo
        print("\n📊 RESUMO GERAL")
        print("-" * 70)
        summary = report["summary"]
        print(f"  Tempo total: {summary['total_time']:.2f}s")
        print(f"  Requisições bem-sucedidas: {summary['success_count']}")
        print(f"  Requisições com falha: {summary['fail_count']}")
        print(f"  Taxa de sucesso: {summary['success_rate']:.2f}%")
        print(f"  Requisições por segundo (RPS): {summary['requests_per_second']:.2f}")
        
        # Tempo de resposta
        print("\n⏱️  TEMPO DE RESPOSTA")
        print("-" * 70)
        rt = report["response_time"]
        print(f"  Média: {rt['avg']:.3f}s")
        print(f"  Mediana: {rt['median']:.3f}s")
        print(f"  Mínimo: {rt['min']:.3f}s")
        print(f"  Máximo: {rt['max']:.3f}s")
        print(f"  Desvio padrão: {rt['std']:.3f}s")
        
        # Métricas por endpoint
        print("\n🔍 MÉTRICAS POR ENDPOINT")
        print("-" * 70)
        for endpoint, metrics in report["endpoint_metrics"].items():
            print(f"\n  {endpoint}")
            print(f"    Total: {metrics['count']}")
            print(f"    Sucesso: {metrics['success_count']} ({metrics['success_rate']:.1f}%)")
            print(f"    Falhas: {metrics['fail_count']}")
            print(f"    Tempo médio: {metrics['avg_response_time']:.3f}s")
            print(f"    Tempo mediano: {metrics['median_response_time']:.3f}s")
            print(f"    Tempo mínimo: {metrics['min_response_time']:.3f}s")
            print(f"    Tempo máximo: {metrics['max_response_time']:.3f}s")
        
        # Gargalos
        print("\n⚠️  GARGALOS IDENTIFICADOS (Top 5 endpoints mais lentos)")
        print("-" * 70)
        for i, bottleneck in enumerate(report["bottlenecks"], 1):
            print(f"  {i}. {bottleneck['endpoint']}")
            print(f"     Tempo médio: {bottleneck['avg_response_time']:.3f}s")
            print(f"     Total de requisições: {bottleneck['count']}")
        
        # Status codes
        print("\n📈 CÓDIGOS DE STATUS HTTP")
        print("-" * 70)
        for code, count in sorted(report["status_codes"].items()):
            percentage = (count / summary['total_requests'] * 100) if summary['total_requests'] > 0 else 0
            print(f"  {code}: {count} ({percentage:.1f}%)")
        
        # Erros
        if report["errors"]:
            print("\n❌ ERROS (Primeiros 20)")
            print("-" * 70)
            for error in report["errors"][:10]:
                print(f"  {error['method']} {error['endpoint']}: {error['error']}")
        
        print("\n" + "=" * 70)
        print(f"Relatório gerado em: {report['timestamp']}")
        print("=" * 70 + "\n")
    
    def save_report(self, report: Dict, filename: str = None):
        """Salvar relatório em arquivo JSON"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"load_test_report_{timestamp}.json"
        
        filepath = os.path.join("backend", "tests", "reports", filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        self.log(f"Relatório salvo em: {filepath}")
        return filepath
    
    def save_csv_report(self, filename: str = None):
        """Salvar resultados detalhados em CSV"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"load_test_results_{timestamp}.csv"
        
        filepath = os.path.join("backend", "tests", "reports", filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        with open(filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                "timestamp", "endpoint", "method", "status_code",
                "response_time", "success", "error"
            ])
            
            for result in self.results:
                writer.writerow([
                    datetime.fromtimestamp(result.timestamp).isoformat(),
                    result.endpoint,
                    result.method,
                    result.status_code,
                    result.response_time,
                    result.success,
                    result.error or ""
                ])
        
        self.log(f"Resultados CSV salvos em: {filepath}")
        return filepath


def main():
    """Função principal"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Teste de carga do SecureVision")
    parser.add_argument("-u", "--users", type=int, default=DEFAULT_USERS,
                       help="Número de usuários concorrentes")
    parser.add_argument("-r", "--requests", type=int, default=DEFAULT_REQUESTS_PER_USER,
                       help="Requisições por usuário")
    parser.add_argument("-t", "--ramp-up", type=int, default=DEFAULT_RAMP_UP_TIME,
                       help="Tempo de ramp-up em segundos")
    parser.add_argument("--save-json", action="store_true",
                       help="Salvar relatório em JSON")
    parser.add_argument("--save-csv", action="store_true",
                       help="Salvar resultados em CSV")
    
    args = parser.parse_args()
    
    # Configurar teste
    config = LoadTestConfig(
        num_users=args.users,
        requests_per_user=args.requests,
        ramp_up_time=args.ramp_up
    )
    
    # Executar teste
    tester = LoadTester(config)
    total_time = tester.run_test()
    
    # Gerar relatório
    report = tester.generate_report(total_time)
    tester.print_report(report)
    
    # Salvar relatórios se solicitado
    if args.save_json:
        tester.save_report(report)
    
    if args.save_csv:
        tester.save_csv_report()


if __name__ == "__main__":
    main()

