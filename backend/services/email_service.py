"""
Serviço de envio de email
Suporta Gmail SMTP (gratuito) e outros provedores
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from typing import List, Optional
from pathlib import Path
from config import settings
import os

logger = logging.getLogger(__name__)


class EmailService:
    """Serviço para envio de emails"""
    
    def __init__(self):
        self.smtp_server = getattr(settings, 'smtp_server', 'smtp.gmail.com')
        self.smtp_port = getattr(settings, 'smtp_port', 587)
        self.smtp_user = getattr(settings, 'smtp_user', None)
        self.smtp_password = getattr(settings, 'smtp_password', None)
        self.smtp_from_email = getattr(settings, 'smtp_from_email', None)
        self.smtp_from_name = getattr(settings, 'smtp_from_name', 'SecureVision')
        self.smtp_use_tls = getattr(settings, 'smtp_use_tls', True)
        
        # Validar formato dos emails
        if self.smtp_user and "@" not in self.smtp_user:
            logger.error(f"❌ ERRO CRÍTICO: O email do usuário não contém '@': {self.smtp_user}")
            logger.error(f"   Deve ser: seuemail@gmail.com (com o @)")
            logger.error(f"   Verifique o arquivo .env e corrija SMTP_USER")
        
        if self.smtp_from_email and "@" not in self.smtp_from_email:
            logger.error(f"❌ ERRO CRÍTICO: O email 'from' não contém '@': {self.smtp_from_email}")
            logger.error(f"   Deve ser: seuemail@gmail.com (com o @)")
            logger.error(f"   Verifique o arquivo .env e corrija SMTP_FROM_EMAIL")
        
        # Log de configuração (sem mostrar senha completa)
        if self.is_configured():
            logger.info(f"Email configurado: servidor={self.smtp_server}:{self.smtp_port}, "
                       f"usuário={self.smtp_user}, from={self.smtp_from_email}")
        else:
            logger.warning("Email NÃO configurado. Configure SMTP_USER, SMTP_PASSWORD e SMTP_FROM_EMAIL no .env")
        
    def is_configured(self) -> bool:
        """Verificar se o serviço de email está configurado"""
        configured = bool(self.smtp_user and self.smtp_password and self.smtp_from_email)
        if not configured:
            missing = []
            if not self.smtp_user:
                missing.append("SMTP_USER")
            if not self.smtp_password:
                missing.append("SMTP_PASSWORD")
            if not self.smtp_from_email:
                missing.append("SMTP_FROM_EMAIL")
            if missing:
                logger.debug(f"Configuração de email incompleta. Faltando: {', '.join(missing)}")
        return configured
    
    def send_email(
        self,
        to_emails: List[str],
        subject: str,
        body_html: str,
        body_text: Optional[str] = None,
        image_path: Optional[str] = None
    ) -> bool:
        """
        Enviar email
        
        Args:
            to_emails: Lista de emails destinatários
            subject: Assunto do email
            body_html: Corpo do email em HTML
            body_text: Corpo do email em texto (opcional)
            image_path: Caminho para imagem anexada (opcional)
        
        Returns:
            True se enviado com sucesso, False caso contrário
        """
        if not self.is_configured():
            logger.warning("Serviço de email não configurado. Configure SMTP_USER, SMTP_PASSWORD e SMTP_FROM_EMAIL")
            return False
        
        if not to_emails:
            logger.warning("Nenhum destinatário especificado")
            return False
        
        try:
            # Criar mensagem
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{self.smtp_from_name} <{self.smtp_from_email}>"
            msg['To'] = ', '.join(to_emails)
            msg['Subject'] = subject
            
            # Adicionar corpo do email
            if body_text:
                part1 = MIMEText(body_text, 'plain', 'utf-8')
                msg.attach(part1)
            
            part2 = MIMEText(body_html, 'html', 'utf-8')
            msg.attach(part2)
            
            # Adicionar imagem se fornecida
            if image_path:
                # Tentar diferentes formatos de caminho
                possible_paths = []
                
                # 1. Caminho como fornecido (pode ser absoluto ou relativo)
                possible_paths.append(Path(image_path))
                
                # 2. Se for relativo, tentar com upload_dir
                if not Path(image_path).is_absolute():
                    # Se já contém "screenshots", usar diretamente
                    if "screenshots" in image_path:
                        # Extrair apenas o nome do arquivo
                        filename = os.path.basename(image_path)
                        possible_paths.append(Path(settings.upload_dir) / "screenshots" / filename)
                    else:
                        # Tentar com upload_dir/screenshots
                        possible_paths.append(Path(settings.upload_dir) / "screenshots" / image_path)
                
                # 3. Tentar caminho absoluto normalizado
                possible_paths.append(Path(os.path.abspath(image_path)))
                
                # Procurar o primeiro caminho que existe
                image_full_path = None
                for path in possible_paths:
                    if path.exists():
                        image_full_path = path
                        break
                
                if image_full_path and image_full_path.exists():
                    try:
                        with open(image_full_path, 'rb') as f:
                            img_data = f.read()
                        img = MIMEImage(img_data)
                        img.add_header('Content-Disposition', 'attachment', filename=image_full_path.name)
                        msg.attach(img)
                        logger.info(f"✅ Imagem anexada ao email: {image_full_path.name} ({len(img_data)} bytes)")
                    except Exception as e:
                        logger.warning(f"Erro ao anexar imagem {image_path}: {e}", exc_info=True)
                else:
                    logger.warning(f"Imagem não encontrada. Tentou os seguintes caminhos:")
                    for path in possible_paths:
                        logger.warning(f"  - {path} (existe: {path.exists()})")
            
            # Conectar e enviar
            logger.debug(f"Conectando ao servidor SMTP {self.smtp_server}:{self.smtp_port}")
            with smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=30) as server:
                if self.smtp_use_tls:
                    logger.debug("Iniciando TLS...")
                    server.starttls()
                
                logger.debug(f"Autenticando como {self.smtp_user}...")
                server.login(self.smtp_user, self.smtp_password)
                logger.debug("Autenticação bem-sucedida. Enviando mensagem...")
                server.send_message(msg)
            
            logger.info(f"✅ Email enviado com sucesso para: {', '.join(to_emails)}")
            return True
            
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"❌ Erro de autenticação SMTP: {e}")
            logger.error(f"   Servidor: {self.smtp_server}:{self.smtp_port}")
            logger.error(f"   Usuário: {self.smtp_user}")
            logger.error("   Possíveis causas:")
            logger.error("   1. Usuário ou senha incorretos")
            logger.error("   2. Para Gmail: Use senha de app, não a senha da conta")
            logger.error("   3. Verificação em duas etapas não ativada (Gmail)")
            logger.error("   4. Acesso de apps menos seguros bloqueado")
            return False
        except smtplib.SMTPException as e:
            logger.error(f"Erro SMTP ao enviar email: {e}")
            return False
        except Exception as e:
            logger.error(f"Erro inesperado ao enviar email: {e}", exc_info=True)
            return False
    
    def send_intrusion_alert(
        self,
        to_emails: List[str],
        camera_name: str,
        event_description: str,
        timestamp: str,
        confidence: float,
        image_path: Optional[str] = None
    ) -> bool:
        """
        Enviar alerta de intrusão por email
        
        Args:
            to_emails: Lista de emails destinatários
            camera_name: Nome da câmera
            event_description: Descrição do evento
            timestamp: Data/hora do evento
            confidence: Nível de confiança da detecção
            image_path: Caminho para imagem da intrusão (opcional)
        
        Returns:
            True se enviado com sucesso, False caso contrário
        """
        subject = f"🚨 ALERTA: Intrusão Detectada - {camera_name}"
        
        # Corpo HTML do email
        body_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .alert-header {{
                    background-color: #dc3545;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 5px 5px 0 0;
                }}
                .alert-content {{
                    background-color: #f8f9fa;
                    padding: 20px;
                    border: 1px solid #dee2e6;
                    border-top: none;
                    border-radius: 0 0 5px 5px;
                }}
                .info-row {{
                    margin: 10px 0;
                    padding: 10px;
                    background-color: white;
                    border-left: 4px solid #dc3545;
                }}
                .label {{
                    font-weight: bold;
                    color: #666;
                }}
                .value {{
                    color: #333;
                }}
                .confidence {{
                    display: inline-block;
                    padding: 5px 10px;
                    background-color: #dc3545;
                    color: white;
                    border-radius: 3px;
                    font-weight: bold;
                }}
                .footer {{
                    margin-top: 20px;
                    padding-top: 20px;
                    border-top: 1px solid #dee2e6;
                    text-align: center;
                    color: #666;
                    font-size: 12px;
                }}
            </style>
        </head>
        <body>
            <div class="alert-header">
                <h1>🚨 ALERTA DE INTRUSÃO</h1>
            </div>
            <div class="alert-content">
                <p><strong>Uma intrusão foi detectada no sistema de monitoramento.</strong></p>
                
                <div class="info-row">
                    <span class="label">Câmera:</span>
                    <span class="value">{camera_name}</span>
                </div>
                
                <div class="info-row">
                    <span class="label">Descrição:</span>
                    <span class="value">{event_description}</span>
                </div>
                
                <div class="info-row">
                    <span class="label">Data/Hora:</span>
                    <span class="value">{timestamp}</span>
                </div>
                
                <div class="info-row">
                    <span class="label">Confiança:</span>
                    <span class="confidence">{int(confidence * 100)}%</span>
                </div>
                
                {f'<div class="info-row"><p><strong>Imagem anexada:</strong> Verifique o anexo para visualizar a captura do evento.</p></div>' if image_path else ''}
                
                <div class="footer">
                    <p>Este é um email automático do sistema SecureVision.</p>
                    <p>Por favor, verifique o sistema imediatamente.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Corpo texto simples
        body_text = f"""
ALERTA DE INTRUSÃO

Uma intrusão foi detectada no sistema de monitoramento.

Câmera: {camera_name}
Descrição: {event_description}
Data/Hora: {timestamp}
Confiança: {int(confidence * 100)}%

Por favor, verifique o sistema imediatamente.

Este é um email automático do sistema SecureVision.
        """
        
        return self.send_email(
            to_emails=to_emails,
            subject=subject,
            body_html=body_html,
            body_text=body_text,
            image_path=image_path
        )


# Instância global do serviço
email_service = EmailService()

