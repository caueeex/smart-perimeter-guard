"""
Configuração do banco de dados MySQL
"""
from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings

# Criar engine do MySQL
engine = create_engine(
    settings.database_url,
    echo=False,  # Mude para True para ver queries SQL
    pool_pre_ping=True,
    pool_recycle=300,
)

# Criar sessão
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para modelos
Base = declarative_base()

# Metadata para criação de tabelas
metadata = MetaData()


def get_db():
    """Dependency para obter sessão do banco"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Criar todas as tabelas no banco"""
    Base.metadata.create_all(bind=engine)


def drop_tables():
    """Remover todas as tabelas do banco"""
    Base.metadata.drop_all(bind=engine)

