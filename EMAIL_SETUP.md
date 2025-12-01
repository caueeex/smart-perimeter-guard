# Configuração de Email para Alertas de Intrusão

O sistema suporta envio de emails quando uma intrusão é detectada. Você pode usar **Gmail gratuitamente** ou outros provedores SMTP.

## 📧 Opção 1: Gmail (GRATUITO e RECOMENDADO)

### Passo 1: Criar Senha de App no Gmail

1. Acesse sua conta Google: https://myaccount.google.com/
2. Vá em **Segurança** → **Verificação em duas etapas** (ative se não estiver ativada)
3. Vá em **Segurança** → **Senhas de app**
4. Selecione **App**: "Email" e **Dispositivo**: "Outro (nome personalizado)"
5. Digite "SecureVision" e clique em **Gerar**
6. **Copie a senha gerada** (16 caracteres, sem espaços)

### Passo 2: Configurar no Backend

Crie ou edite o arquivo `.env` na pasta `backend/`:

```env
# Configurações de Email (Gmail)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seuemail@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx
SMTP_FROM_EMAIL=seuemail@gmail.com
SMTP_FROM_NAME=SecureVision
SMTP_USE_TLS=True

# Destinatários dos Alertas
ALERT_RECIPIENT_MODE=admins_only
# ALERT_EMAILS=email1@exemplo.com,email2@exemplo.com
```

**Importante:**
- `SMTP_USER`: Seu email do Gmail completo
- `SMTP_PASSWORD`: A senha de app gerada (16 caracteres, sem espaços)
- `SMTP_FROM_EMAIL`: Pode ser o mesmo que `SMTP_USER`

### Passo 3: Reiniciar o Backend

Após configurar, reinicie o servidor backend para carregar as novas configurações.

## 📧 Opção 2: Outros Provedores SMTP

### Outlook/Hotmail
```env
SMTP_SERVER=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=seuemail@outlook.com
SMTP_PASSWORD=suasenha
SMTP_FROM_EMAIL=seuemail@outlook.com
SMTP_USE_TLS=True
```

### Yahoo
```env
SMTP_SERVER=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=seuemail@yahoo.com
SMTP_PASSWORD=suasenha
SMTP_FROM_EMAIL=seuemail@yahoo.com
SMTP_USE_TLS=True
```

### SendGrid (Free Tier: 100 emails/dia)
```env
SMTP_SERVER=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=sua_api_key_sendgrid
SMTP_FROM_EMAIL=seuemail@seudominio.com
SMTP_USE_TLS=True
```

### Mailgun (Free Tier: 5.000 emails/mês)
```env
SMTP_SERVER=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@seudominio.mailgun.org
SMTP_PASSWORD=sua_senha_mailgun
SMTP_FROM_EMAIL=seuemail@seudominio.com
SMTP_USE_TLS=True
```

## 📬 Configurar Destinatários dos Alertas

No arquivo `.env`, você pode configurar **para quem** os emails serão enviados:

### Opção 1: Apenas Administradores (PADRÃO)
```env
ALERT_RECIPIENT_MODE=admins_only
```
Envia email apenas para usuários com perfil de **administrador** que estão ativos.

### Opção 2: Todos os Usuários
```env
ALERT_RECIPIENT_MODE=all_users
```
Envia email para **todos os usuários ativos** no sistema.

### Opção 3: Emails Customizados
```env
ALERT_RECIPIENT_MODE=custom
ALERT_EMAILS=email1@exemplo.com,email2@exemplo.com,email3@exemplo.com
```
Envia email apenas para os emails especificados (separados por vírgula).

### Opção 4: Administradores + Emails Customizados
```env
ALERT_RECIPIENT_MODE=admins_only
ALERT_EMAILS=seguranca@empresa.com,gerente@empresa.com
```
Envia para administradores **E** para os emails customizados adicionais.

## ✅ Testar Configuração

Após configurar, quando uma intrusão for detectada:
1. O sistema enviará email automaticamente conforme a configuração escolhida
2. O email incluirá:
   - Nome da câmera
   - Descrição do evento
   - Data/hora
   - Nível de confiança
   - Imagem anexada (se disponível)

## 🔒 Segurança

- **NUNCA** commite o arquivo `.env` no Git
- A senha de app do Gmail é mais segura que a senha normal
- Use senhas de app específicas para cada aplicação

## 📝 Notas

- O envio de email é feito em thread separada para não bloquear a detecção
- Se o email falhar, o evento ainda será registrado normalmente
- Verifique os logs do backend para ver se os emails estão sendo enviados

