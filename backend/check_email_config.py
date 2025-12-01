"""
Script para verificar configuração de email
"""
import os
from config import settings

print("=" * 60)
print("VERIFICAÇÃO DE CONFIGURAÇÃO DE EMAIL")
print("=" * 60)
print()

# Verificar variáveis de ambiente
env_vars = {
    "SMTP_SERVER": os.getenv("SMTP_SERVER"),
    "SMTP_PORT": os.getenv("SMTP_PORT"),
    "SMTP_USER": os.getenv("SMTP_USER"),
    "SMTP_PASSWORD": os.getenv("SMTP_PASSWORD"),
    "SMTP_FROM_EMAIL": os.getenv("SMTP_FROM_EMAIL"),
    "SMTP_FROM_NAME": os.getenv("SMTP_FROM_NAME"),
    "SMTP_USE_TLS": os.getenv("SMTP_USE_TLS"),
}

print("Variáveis de ambiente (.env):")
for key, value in env_vars.items():
    if key == "SMTP_PASSWORD" and value:
        display_value = "*" * len(value) if value else "NÃO DEFINIDO"
    else:
        display_value = value if value else "NÃO DEFINIDO"
    print(f"  {key}: {display_value}")

print()
print("Valores carregados pelo Settings:")
print(f"  smtp_server: {settings.smtp_server}")
print(f"  smtp_port: {settings.smtp_port}")
print(f"  smtp_user: {settings.smtp_user}")
print(f"  smtp_password: {'*' * len(settings.smtp_password) if settings.smtp_password else 'None'}")
print(f"  smtp_from_email: {settings.smtp_from_email}")
print(f"  smtp_from_name: {settings.smtp_from_name}")
print(f"  smtp_use_tls: {settings.smtp_use_tls}")

print()
print("Status da configuração:")
if settings.smtp_user and settings.smtp_password and settings.smtp_from_email:
    print("  ✅ Configuração completa")
else:
    print("  ❌ Configuração incompleta")
    missing = []
    if not settings.smtp_user:
        missing.append("SMTP_USER")
    if not settings.smtp_password:
        missing.append("SMTP_PASSWORD")
    if not settings.smtp_from_email:
        missing.append("SMTP_FROM_EMAIL")
    print(f"  Faltando: {', '.join(missing)}")

print()
print("=" * 60)
print("DICAS PARA GMAIL:")
print("=" * 60)
print("1. Use SENHA DE APP, não a senha da sua conta Google")
print("2. Para criar senha de app:")
print("   - Acesse: https://myaccount.google.com/")
print("   - Segurança → Verificação em duas etapas (ative se necessário)")
print("   - Segurança → Senhas de app")
print("   - Gere uma senha para 'Email' e 'Outro (SecureVision)'")
print("3. A senha de app tem 16 caracteres (sem espaços)")
print("4. Exemplo no .env:")
print("   SMTP_USER=seuemail@gmail.com")
print("   SMTP_PASSWORD=abcd efgh ijkl mnop  (sem espaços: abcdefghijklmnop)")
print("   SMTP_FROM_EMAIL=seuemail@gmail.com")
print("=" * 60)

