"""
Script simplificado para criar banco de dados
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pymysql
from config import settings

def create_database_simple():
    """Criar banco de dados MySQL"""
    print("Criando banco de dados MySQL...")
    
    try:
        # Conectar ao MySQL sem especificar banco
        connection = pymysql.connect(
            host=settings.db_host,
            port=settings.db_port,
            user=settings.db_user,
            password=settings.db_password,
            charset='utf8mb4'
        )
        
        with connection.cursor() as cursor:
            # Criar banco de dados
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {settings.db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            print(f"Banco de dados '{settings.db_name}' criado com sucesso!")
        
        connection.close()
        
        # Agora criar as tabelas
        from database import create_tables
        create_tables()
        print("Tabelas criadas com sucesso!")
        
        return True
        
    except Exception as e:
        print(f"Erro ao criar banco de dados: {e}")
        return False

if __name__ == "__main__":
    create_database_simple()
