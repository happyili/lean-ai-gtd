#!/usr/bin/env python3
"""
Complete Database Migration Script for AIGTD
This script creates all tables based on current models
Date: 2025-01-27
"""

import os
import sys
import sqlite3
import psycopg2
from urllib.parse import urlparse
from datetime import datetime

def get_database_type():
    """Detect database type from DATABASE_URL"""
    database_url = os.getenv('DATABASE_URL', 'sqlite:///data/aigtd.db')
    
    if database_url.startswith('sqlite'):
        return 'sqlite'
    elif database_url.startswith('postgresql'):
        return 'postgresql'
    else:
        raise ValueError(f"Unsupported database URL: {database_url}")

def execute_sql_file(db_conn, sql_file_path):
    """Execute SQL file"""
    print(f"Executing SQL file: {sql_file_path}")
    
    with open(sql_file_path, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    # Split by semicolon and execute each statement
    statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
    
    cursor = db_conn.cursor()
    for statement in statements:
        if statement:
            try:
                cursor.execute(statement)
                print(f"✓ Executed: {statement[:50]}...")
            except Exception as e:
                print(f"✗ Error executing: {statement[:50]}...")
                print(f"  Error: {e}")
                # Continue with other statements
    db_conn.commit()
    cursor.close()

def migrate_sqlite():
    """Migrate SQLite database"""
    database_url = os.getenv('DATABASE_URL', 'sqlite:///data/aigtd.db')
    
    # Extract file path from SQLite URL
    if database_url.startswith('sqlite:///'):
        db_path = database_url[10:]  # Remove 'sqlite:///'
    else:
        db_path = 'data/aigtd.db'
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    print(f"Migrating SQLite database: {db_path}")
    
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")
    
    # Execute migration
    sql_file = os.path.join(os.path.dirname(__file__), 'migrations', 'sqllite', '000_complete_schema_sqlite.sql')
    execute_sql_file(conn, sql_file)
    
    conn.close()
    print("✓ SQLite migration completed")

def migrate_postgresql():
    """Migrate PostgreSQL database"""
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is required for PostgreSQL migration")
    
    print(f"Migrating PostgreSQL database")
    
    conn = psycopg2.connect(database_url)
    conn.autocommit = True
    
    # Execute migration
    sql_file = os.path.join(os.path.dirname(__file__), 'migrations', 'supabase', '000_complete_schema_supabase.sql')
    execute_sql_file(conn, sql_file)
    
    conn.close()
    print("✓ PostgreSQL migration completed")

def verify_tables(db_conn, db_type):
    """Verify that all tables were created successfully"""
    print("\nVerifying table creation...")
    
    expected_tables = ['users', 'records', 'pomodoro_tasks', 'info_resources', 'reminders']
    
    if db_type == 'sqlite':
        cursor = db_conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
    else:  # postgresql
        cursor = db_conn.cursor()
        cursor.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public';")
        tables = [row[0] for row in cursor.fetchall()]
    
    print(f"Found tables: {tables}")
    
    missing_tables = set(expected_tables) - set(tables)
    if missing_tables:
        print(f"✗ Missing tables: {missing_tables}")
        return False
    else:
        print("✓ All expected tables created successfully")
        return True

def main():
    """Main migration function"""
    print("=" * 60)
    print("AIGTD Database Migration")
    print("=" * 60)
    print(f"Timestamp: {datetime.now()}")
    
    try:
        db_type = get_database_type()
        print(f"Database type: {db_type}")
        
        if db_type == 'sqlite':
            migrate_sqlite()
            # Verify tables
            database_url = os.getenv('DATABASE_URL', 'sqlite:///data/aigtd.db')
            db_path = database_url[10:] if database_url.startswith('sqlite:///') else 'data/aigtd.db'
            conn = sqlite3.connect(db_path)
            verify_tables(conn, db_type)
            conn.close()
            
        elif db_type == 'postgresql':
            migrate_postgresql()
            # Verify tables
            conn = psycopg2.connect(os.getenv('DATABASE_URL'))
            verify_tables(conn, db_type)
            conn.close()
        
        print("\n" + "=" * 60)
        print("✓ Migration completed successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
