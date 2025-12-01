"""
Configurações do sistema SecureVision
"""
import os
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Configurações da aplicação"""
    
    # Configurações do Banco de Dados
    database_url: str = Field(
        default="mysql+pymysql://root:@localhost:3306/securevision",
        env="DATABASE_URL"
    )
    db_host: str = Field(default="localhost", env="DB_HOST")
    db_port: int = Field(default=3306, env="DB_PORT")
    db_user: str = Field(default="root", env="DB_USER")
    db_password: str = Field(default="", env="DB_PASSWORD")
    db_name: str = Field(default="securevision", env="DB_NAME")
    
    # Configurações de Segurança
    secret_key: str = Field(
        default="your-secret-key-here-change-in-production",
        env="SECRET_KEY"
    )
    algorithm: str = Field(default="HS256", env="ALGORITHM")
    access_token_expire_minutes: int = Field(
        default=30, env="ACCESS_TOKEN_EXPIRE_MINUTES"
    )
    
    # Configurações da API
    api_v1_str: str = Field(default="/api/v1", env="API_V1_STR")
    project_name: str = Field(default="SecureVision", env="PROJECT_NAME")
    version: str = Field(default="1.0.0", env="VERSION")
    
    # Configurações de IA
    model_path: str = Field(default="./models/yolov8n.pt", env="MODEL_PATH")
    confidence_threshold: float = Field(default=0.5, env="CONFIDENCE_THRESHOLD")
    iou_threshold: float = Field(default=0.45, env="IOU_THRESHOLD")
    
    # Configurações de Armazenamento
    upload_dir: str = Field(default="./uploads", env="UPLOAD_DIR")
    max_file_size: int = Field(default=10485760, env="MAX_FILE_SIZE")  # 10MB
    
    # Configurações de WebSocket
    ws_port: int = Field(default=8001, env="WS_PORT")
    
    # Configurações de Câmera
    default_fps: int = Field(default=15, env="DEFAULT_FPS")
    default_resolution: str = Field(default="640x480", env="DEFAULT_RESOLUTION")
    
    # Configurações de Email (SMTP)
    smtp_server: str = Field(default="smtp.gmail.com", env="SMTP_SERVER")
    smtp_port: int = Field(default=587, env="SMTP_PORT")
    smtp_user: Optional[str] = Field(default=None, env="SMTP_USER")
    smtp_password: Optional[str] = Field(default=None, env="SMTP_PASSWORD")
    smtp_from_email: Optional[str] = Field(default=None, env="SMTP_FROM_EMAIL")
    smtp_from_name: str = Field(default="SecureVision", env="SMTP_FROM_NAME")
    smtp_use_tls: bool = Field(default=True, env="SMTP_USE_TLS")
    
    # Destinatários de alertas de intrusão
    # Opções:
    # - "all_users": Envia para todos os usuários ativos
    # - "admins_only": Envia apenas para administradores
    # - "custom": Usa apenas os emails em ALERT_EMAILS
    alert_recipient_mode: str = Field(default="admins_only", env="ALERT_RECIPIENT_MODE")
    # Emails adicionais para receber alertas (separados por vírgula)
    # Exemplo: "email1@exemplo.com,email2@exemplo.com"
    alert_emails: Optional[str] = Field(default=None, env="ALERT_EMAILS")
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        protected_namespaces = ('settings_',)


# Instância global das configurações
settings = Settings()

# Criar diretórios necessários
os.makedirs(settings.upload_dir, exist_ok=True)
os.makedirs("./models", exist_ok=True)
os.makedirs("./logs", exist_ok=True)

