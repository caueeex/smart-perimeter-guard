"""
Script para testar envio de email
"""
import sys
import os
from services.email_service import EmailService
from config import settings

print("=" * 60)
print("TESTE DE ENVIO DE EMAIL")
print("=" * 60)
print()

# Verificar configuração
email_service = EmailService()

if not email_service.is_configured():
    print("❌ Email não está configurado corretamente!")
    print()
    print("Verifique o arquivo .env na pasta backend/")
    print("Variáveis necessárias:")
    print("  SMTP_USER=seuemail@gmail.com")
    print("  SMTP_PASSWORD=sua_senha_de_app")
    print("  SMTP_FROM_EMAIL=seuemail@gmail.com")
    sys.exit(1)

print("✅ Configuração encontrada:")
print(f"   Servidor: {email_service.smtp_server}:{email_service.smtp_port}")
print(f"   Usuário: {email_service.smtp_user}")
print(f"   From: {email_service.smtp_from_email}")
print(f"   TLS: {email_service.smtp_use_tls}")
print()

# Verificar formato do email
if "@" not in email_service.smtp_user:
    print("❌ ERRO: O email do usuário não contém '@'")
    print(f"   Valor atual: {email_service.smtp_user}")
    print("   Deve ser: seuemail@gmail.com")
    print()
    print("   Verifique o arquivo .env e certifique-se de que:")
    print("   SMTP_USER=seuemail@gmail.com")
    print("   (com o @ no lugar correto)")
    sys.exit(1)

if "@" not in email_service.smtp_from_email:
    print("❌ ERRO: O email 'from' não contém '@'")
    print(f"   Valor atual: {email_service.smtp_from_email}")
    print("   Deve ser: seuemail@gmail.com")
    sys.exit(1)

# Verificar se a senha não está vazia
if not email_service.smtp_password or len(email_service.smtp_password.strip()) == 0:
    print("❌ ERRO: A senha está vazia!")
    print("   Configure SMTP_PASSWORD no arquivo .env")
    sys.exit(1)

# Verificar comprimento da senha (senha de app do Gmail tem 16 caracteres)
if len(email_service.smtp_password.replace(" ", "")) < 10:
    print("⚠️  AVISO: A senha parece muito curta.")
    print("   Senhas de app do Gmail têm 16 caracteres (sem espaços)")
    print()

print("Tentando enviar email de teste...")
print()

# Email de teste
test_email = email_service.smtp_user  # Enviar para o próprio email
subject = "Teste de Email - SecureVision"
body_html = """
<html>
<body>
    <h2>Teste de Email</h2>
    <p>Se você recebeu este email, a configuração está funcionando corretamente!</p>
    <p><strong>Servidor:</strong> {server}</p>
    <p><strong>Usuário:</strong> {user}</p>
    <p><strong>Data/Hora:</strong> {datetime}</p>
</body>
</html>
""".format(
    server=f"{email_service.smtp_server}:{email_service.smtp_port}",
    user=email_service.smtp_user,
    datetime=os.popen("date /t && time /t").read().strip() if os.name == 'nt' else "N/A"
)

try:
    success = email_service.send_email(
        to_emails=[test_email],
        subject=subject,
        body_html=body_html
    )
    
    if success:
        print("✅ Email enviado com sucesso!")
        print(f"   Verifique a caixa de entrada de: {test_email}")
    else:
        print("❌ Falha ao enviar email")
        print("   Verifique os logs acima para mais detalhes")
        
except Exception as e:
    print(f"❌ Erro ao enviar email: {e}")
    print()
    print("Possíveis causas:")
    print("1. Usuário ou senha incorretos")
    print("2. Para Gmail: Use senha de app (não a senha da conta)")
    print("3. Verificação em duas etapas não ativada")
    print("4. Email sem o '@' no lugar correto")
    print()
    print("Como criar senha de app no Gmail:")
    print("1. Acesse: https://myaccount.google.com/")
    print("2. Segurança → Verificação em duas etapas (ative)")
    print("3. Segurança → Senhas de app")
    print("4. Gere senha para 'Email' e 'Outro (SecureVision)'")
    print("5. Copie a senha (16 caracteres, sem espaços)")
    print("6. Cole no .env como: SMTP_PASSWORD=abcdefghijklmnop")

print()
print("=" * 60)

