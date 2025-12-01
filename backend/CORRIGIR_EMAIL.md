# 🔧 Como Corrigir o Email no .env

## ❌ Problema Identificado

O email está configurado como: `soterocaue2gmail.com` (sem o `@`)

## ✅ Solução

Edite o arquivo `.env` na pasta `backend/` e corrija as seguintes linhas:

```env
SMTP_USER=soterocaue2@gmail.com
SMTP_FROM_EMAIL=soterocaue2@gmail.com
```

**IMPORTANTE:** 
- O `@` deve estar presente
- Não deve haver espaços antes ou depois do email
- O email deve ser completo: `usuario@gmail.com`

## 📝 Exemplo Completo do .env

```env
# Configurações de Email (Gmail)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=soterocaue2@gmail.com
SMTP_PASSWORD=sua_senha_de_app_aqui
SMTP_FROM_EMAIL=soterocaue2@gmail.com
SMTP_FROM_NAME=SecureVision
SMTP_USE_TLS=True

# Destinatários dos Alertas
ALERT_RECIPIENT_MODE=logged_in_user
```

## 🔑 Sobre a Senha de App do Gmail

Se você ainda não criou uma senha de app:

1. Acesse: https://myaccount.google.com/
2. Vá em **Segurança** → **Verificação em duas etapas** (ative se necessário)
3. Vá em **Segurança** → **Senhas de app**
4. Clique em **Selecionar app** → escolha **Email**
5. Clique em **Selecionar dispositivo** → escolha **Outro (nome personalizado)**
6. Digite: **SecureVision**
7. Clique em **Gerar**
8. **Copie a senha gerada** (16 caracteres)
9. Cole no `.env` como `SMTP_PASSWORD=abcdefghijklmnop` (sem espaços)

## ⚠️ Dicas Importantes

- A senha de app tem **16 caracteres** (sem espaços)
- Mesmo que o Gmail mostre com espaços (ex: `abcd efgh ijkl mnop`), remova os espaços no `.env`
- **NÃO use a senha da sua conta Google**, apenas senhas de app
- Após editar o `.env`, **reinicie o servidor backend**

## 🧪 Testar a Configuração

Após corrigir, execute:

```bash
cd backend
python test_email.py
```

Isso enviará um email de teste para verificar se está funcionando.

