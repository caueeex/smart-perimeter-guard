#!/usr/bin/env python3
"""
Gerador de Relatório de Teste de Carga em Markdown
"""
import json
import os
import sys
from datetime import datetime
from typing import Dict


def generate_markdown_report(json_file: str, output_file: str = None):
    """Gerar relatório em Markdown a partir de JSON"""
    
    # Ler relatório JSON
    with open(json_file, "r", encoding="utf-8") as f:
        report = json.load(f)
    
    # Nome do arquivo de saída
    if output_file is None:
        base_name = os.path.splitext(os.path.basename(json_file))[0]
        output_file = f"{base_name}.md"
    
    output_path = os.path.join(os.path.dirname(json_file), output_file)
    
    # Gerar Markdown
    md_content = []
    
    # Cabeçalho
    md_content.append("# Relatório de Teste de Carga - SecureVision")
    md_content.append("")
    md_content.append(f"**Data/Hora:** {report['timestamp']}")
    md_content.append("")
    md_content.append("---")
    md_content.append("")
    
    # Configuração do teste
    md_content.append("## 📋 Configuração do Teste")
    md_content.append("")
    config = report["test_config"]
    md_content.append(f"- **Usuários concorrentes:** {config['num_users']}")
    md_content.append(f"- **Requisições por usuário:** {config['requests_per_user']}")
    md_content.append(f"- **Total de requisições:** {config['total_requests']}")
    md_content.append(f"- **Tempo de ramp-up:** {config['ramp_up_time']}s")
    md_content.append("")
    
    # Resumo geral
    md_content.append("## 📊 Resumo Geral")
    md_content.append("")
    summary = report["summary"]
    md_content.append("| Métrica | Valor |")
    md_content.append("|---------|-------|")
    md_content.append(f"| Tempo total | {summary['total_time']:.2f}s |")
    md_content.append(f"| Requisições bem-sucedidas | {summary['success_count']} |")
    md_content.append(f"| Requisições com falha | {summary['fail_count']} |")
    md_content.append(f"| Taxa de sucesso | {summary['success_rate']:.2f}% |")
    md_content.append(f"| Requisições por segundo (RPS) | {summary['requests_per_second']:.2f} |")
    md_content.append("")
    
    # Tempo de resposta
    md_content.append("## ⏱️ Tempo de Resposta")
    md_content.append("")
    rt = report["response_time"]
    md_content.append("| Métrica | Valor |")
    md_content.append("|---------|-------|")
    md_content.append(f"| Média | {rt['avg']:.3f}s |")
    md_content.append(f"| Mediana | {rt['median']:.3f}s |")
    md_content.append(f"| Mínimo | {rt['min']:.3f}s |")
    md_content.append(f"| Máximo | {rt['max']:.3f}s |")
    md_content.append(f"| Desvio padrão | {rt['std']:.3f}s |")
    md_content.append("")
    
    # Métricas por endpoint
    md_content.append("## 🔍 Métricas por Endpoint")
    md_content.append("")
    for endpoint, metrics in report["endpoint_metrics"].items():
        md_content.append(f"### {endpoint}")
        md_content.append("")
        md_content.append("| Métrica | Valor |")
        md_content.append("|---------|-------|")
        md_content.append(f"| Total de requisições | {metrics['count']} |")
        md_content.append(f"| Sucesso | {metrics['success_count']} ({metrics['success_rate']:.1f}%) |")
        md_content.append(f"| Falhas | {metrics['fail_count']} |")
        md_content.append(f"| Tempo médio | {metrics['avg_response_time']:.3f}s |")
        md_content.append(f"| Tempo mediano | {metrics['median_response_time']:.3f}s |")
        md_content.append(f"| Tempo mínimo | {metrics['min_response_time']:.3f}s |")
        md_content.append(f"| Tempo máximo | {metrics['max_response_time']:.3f}s |")
        md_content.append(f"| Desvio padrão | {metrics['std_response_time']:.3f}s |")
        md_content.append("")
    
    # Gargalos
    md_content.append("## ⚠️ Gargalos Identificados")
    md_content.append("")
    md_content.append("Top 5 endpoints mais lentos:")
    md_content.append("")
    md_content.append("| # | Endpoint | Tempo Médio | Total de Requisições |")
    md_content.append("|---|----------|-------------|----------------------|")
    for i, bottleneck in enumerate(report["bottlenecks"], 1):
        md_content.append(
            f"| {i} | {bottleneck['endpoint']} | "
            f"{bottleneck['avg_response_time']:.3f}s | {bottleneck['count']} |"
        )
    md_content.append("")
    
    # Status codes
    md_content.append("## 📈 Códigos de Status HTTP")
    md_content.append("")
    md_content.append("| Código | Quantidade | Percentual |")
    md_content.append("|--------|------------|------------|")
    for code, count in sorted(report["status_codes"].items()):
        percentage = (count / summary['total_requests'] * 100) if summary['total_requests'] > 0 else 0
        md_content.append(f"| {code} | {count} | {percentage:.1f}% |")
    md_content.append("")
    
    # Erros
    if report["errors"]:
        md_content.append("## ❌ Erros Encontrados")
        md_content.append("")
        md_content.append(f"Total de erros: {len(report['errors'])}")
        md_content.append("")
        md_content.append("### Primeiros 20 Erros")
        md_content.append("")
        md_content.append("| Endpoint | Método | Erro |")
        md_content.append("|----------|--------|------|")
        for error in report["errors"][:20]:
            error_msg = error['error'][:100] if len(error['error']) > 100 else error['error']
            md_content.append(f"| {error['endpoint']} | {error['method']} | {error_msg} |")
        md_content.append("")
    
    # Análise e Recomendações
    md_content.append("## 💡 Análise e Recomendações")
    md_content.append("")
    
    # Analisar gargalos
    if report["bottlenecks"]:
        slowest = report["bottlenecks"][0]
        if slowest["avg_response_time"] > 1.0:
            md_content.append(f"### ⚠️ Performance Crítica")
            md_content.append("")
            md_content.append(
                f"O endpoint **{slowest['endpoint']}** apresenta tempo médio de resposta "
                f"de {slowest['avg_response_time']:.3f}s, o que pode indicar problemas de performance."
            )
            md_content.append("")
            md_content.append("**Recomendações:**")
            md_content.append("- Revisar consultas ao banco de dados")
            md_content.append("- Verificar índices nas tabelas")
            md_content.append("- Considerar cache para resultados frequentes")
            md_content.append("- Otimizar queries SQL")
            md_content.append("")
    
    # Analisar taxa de sucesso
    if summary['success_rate'] < 95:
        md_content.append("### ⚠️ Taxa de Sucesso Baixa")
        md_content.append("")
        md_content.append(
            f"A taxa de sucesso de {summary['success_rate']:.2f}% está abaixo do ideal (95%+)."
        )
        md_content.append("")
        md_content.append("**Recomendações:**")
        md_content.append("- Revisar tratamento de erros")
        md_content.append("- Verificar limites do servidor")
        md_content.append("- Aumentar timeout das requisições")
        md_content.append("- Verificar capacidade do banco de dados")
        md_content.append("")
    
    # Analisar RPS
    if summary['requests_per_second'] < 10:
        md_content.append("### ⚠️ Taxa de Requisições Baixa")
        md_content.append("")
        md_content.append(
            f"A taxa de {summary['requests_per_second']:.2f} requisições por segundo pode indicar "
            "limitações de capacidade."
        )
        md_content.append("")
        md_content.append("**Recomendações:**")
        md_content.append("- Considerar escalabilidade horizontal")
        md_content.append("- Otimizar conexões com banco de dados")
        md_content.append("- Usar pool de conexões")
        md_content.append("- Considerar balanceamento de carga")
        md_content.append("")
    
    # Conclusão
    md_content.append("## 📝 Conclusão")
    md_content.append("")
    md_content.append(
        f"O teste de carga foi executado com {config['num_users']} usuários concorrentes, "
        f"totalizando {config['total_requests']} requisições em {summary['total_time']:.2f} segundos. "
        f"A taxa de sucesso foi de {summary['success_rate']:.2f}% com uma média de "
        f"{summary['requests_per_second']:.2f} requisições por segundo."
    )
    md_content.append("")
    
    # Salvar arquivo
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_content))
    
    print(f"Relatório Markdown gerado: {output_path}")
    return output_path


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python generate_load_report.py <arquivo_json> [arquivo_saida.md]")
        sys.exit(1)
    
    json_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    generate_markdown_report(json_file, output_file)


