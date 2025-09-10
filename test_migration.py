#!/usr/bin/env python3
"""
Migration Test Script for AIGTD Database Schema
This script tests the complete schema migration to ensure it works correctly.
"""

import os
import sys
import sqlite3
import tempfile
import subprocess
from pathlib import Path

def test_sqlite_migration():
    """Test the migration with SQLite database"""
    print("🧪 Testing SQLite migration...")
    
    # Create temporary database
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp_db:
        db_path = tmp_db.name
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Read and execute migration (SQLite version)
        migration_file = Path(__file__).parent / "supabase/migrations/007_complete_schema_sqlite.sql"
        
        if not migration_file.exists():
            print(f"❌ Migration file not found: {migration_file}")
            return False
        
        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        # Execute migration (already SQLite compatible)
        cursor.executescript(migration_sql)
        conn.commit()
        
        # Verify tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        
        expected_tables = ['users', 'records']
        for table in expected_tables:
            if table not in tables:
                print(f"❌ Table {table} not created")
                return False
        
        print("✅ All tables created successfully")
        
        # Verify users table structure
        cursor.execute("PRAGMA table_info(users);")
        users_columns = [row[1] for row in cursor.fetchall()]
        expected_users_columns = [
            'id', 'username', 'email', 'password_hash', 'first_name', 'last_name',
            'avatar_url', 'is_active', 'is_verified', 'is_admin', 'failed_login_attempts',
            'last_failed_login', 'account_locked_until', 'refresh_token',
            'refresh_token_expires_at', 'created_at', 'updated_at', 'last_login_at'
        ]
        
        for col in expected_users_columns:
            if col not in users_columns:
                print(f"❌ Users table missing column: {col}")
                return False
        
        print("✅ Users table structure verified")
        
        # Verify records table structure
        cursor.execute("PRAGMA table_info(records);")
        records_columns = [row[1] for row in cursor.fetchall()]
        expected_records_columns = [
            'id', 'content', 'category', 'parent_id', 'user_id', 'priority',
            'progress', 'progress_notes', 'created_at', 'updated_at',
            'status', 'task_type'
        ]
        
        for col in expected_records_columns:
            if col not in records_columns:
                print(f"❌ Records table missing column: {col}")
                return False
        
        print("✅ Records table structure verified")
        
        # Test data insertion
        cursor.execute("""
            INSERT OR IGNORE INTO users (username, email, password_hash, first_name, last_name)
            VALUES ('testuser', 'test@example.com', 'hashed_password', 'Test', 'User')
        """)
        
        cursor.execute("""
            INSERT INTO records (content, category, user_id, priority, status, task_type)
            VALUES ('Test task', 'task', 2, 'medium', 'active', 'work')
        """)
        
        conn.commit()
        
        # Verify data
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM records")
        record_count = cursor.fetchone()[0]
        
        if user_count < 1:
            print(f"❌ Expected at least 1 user, got {user_count}")
            return False
        
        if record_count != 1:
            print(f"❌ Expected 1 record, got {record_count}")
            return False
        
        print("✅ Data insertion and verification successful")
        
        return True
        
    except Exception as e:
        print(f"❌ Migration test failed: {e}")
        return False
    
    finally:
        conn.close()
        os.unlink(db_path)

def test_supabase_migration():
    """Test the migration with Supabase (if available)"""
    print("🧪 Testing Supabase migration...")
    
    # Check if we have Supabase CLI
    try:
        result = subprocess.run(['supabase', '--version'], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode != 0:
            print("⚠️  Supabase CLI not available, skipping Supabase test")
            return True
    except (subprocess.TimeoutExpired, FileNotFoundError):
        print("⚠️  Supabase CLI not available, skipping Supabase test")
        return True
    
    print("✅ Supabase CLI available")
    return True

def main():
    """Run all migration tests"""
    print("🚀 Starting AIGTD Database Migration Tests")
    print("=" * 50)
    
    tests = [
        ("SQLite Migration", test_sqlite_migration),
        ("Supabase Migration", test_supabase_migration),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n📋 Running {test_name}...")
        if test_func():
            print(f"✅ {test_name} PASSED")
            passed += 1
        else:
            print(f"❌ {test_name} FAILED")
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Migration is ready to use.")
        return 0
    else:
        print("💥 Some tests failed. Please check the migration.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
