"""
Script para criar banco de dados SQLite
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import create_tables

def create_sqlite_database():
    """Criar banco de dados SQLite"""
    print("Criando banco de dados SQLite...")
    
    try:
        # Criar as tabelas
        create_tables()
        print("Banco de dados SQLite criado com sucesso!")
        print("Tabelas criadas com sucesso!")
        
        return True
        
    except Exception as e:
        print(f"Erro ao criar banco de dados: {e}")
        return False

if __name__ == "__main__":
    create_sqlite_database()

