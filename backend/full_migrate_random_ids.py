#!/usr/bin/env python3
"""
全量数据库迁移脚本 - 创建使用随机ID的新数据库
支持PostgreSQL和SQLite的全新数据库初始化
"""

import os
import sys
import sqlite3
import time
from pathlib import Path
from datetime import datetime

# 添加项目根目录到Python路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def detect_database_type(database_url):
    """检测数据库类型"""
    if not database_url:
        return 'sqlite'
    elif 'postgresql' in database_url.lower() or 'supabase' in database_url.lower():
        return 'postgresql'
    elif 'sqlite' in database_url.lower() or database_url.startswith('sqlite://'):
        return 'sqlite'
    else:
        # 默认假设是SQLite文件路径
        return 'sqlite'

def create_fresh_sqlite_db():
    """创建全新的SQLite数据库with随机ID"""
    print("创建全新SQLite数据库...")
    
    # 数据库文件路径
    data_dir = project_root.parent / "data"
    data_dir.mkdir(exist_ok=True)
    db_path = data_dir / "aigtd_random_ids.db"
    
    # 如果文件存在，备份
    if db_path.exists():
        backup_path = data_dir / f"aigtd_random_ids_backup_{int(time.time())}.db"
        import shutil
        shutil.move(str(db_path), str(backup_path))
        print(f"已备份现有数据库到: {backup_path}")
    
    try:
        # 连接新数据库
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        print("创建用户表...")
        cursor.execute("""
        CREATE TABLE users (
            id BIGINT PRIMARY KEY NOT NULL,
            username VARCHAR(80) UNIQUE NOT NULL,
            email VARCHAR(120) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            first_name VARCHAR(50),
            last_name VARCHAR(50),
            avatar_url VARCHAR(255),
            is_active BOOLEAN DEFAULT 1,
            is_verified BOOLEAN DEFAULT 0,
            is_admin BOOLEAN DEFAULT 0,
            failed_login_attempts INTEGER DEFAULT 0,
            last_failed_login DATETIME,
            account_locked_until DATETIME,
            refresh_token VARCHAR(255),
            refresh_token_expires_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login_at DATETIME
        )
        """)
        
        # 创建用户表索引
        cursor.execute("CREATE INDEX ix_users_username ON users(username)")
        cursor.execute("CREATE INDEX ix_users_email ON users(email)")
        
        print("创建记录表...")
        cursor.execute("""
        CREATE TABLE records (
            id BIGINT PRIMARY KEY NOT NULL,
            content TEXT NOT NULL,
            category VARCHAR(20) DEFAULT 'general',
            parent_id BIGINT,
            user_id BIGINT,
            priority VARCHAR(20) DEFAULT 'medium',
            progress INTEGER DEFAULT 0,
            progress_notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(20) DEFAULT 'active',
            task_type VARCHAR(20) DEFAULT 'work',
            FOREIGN KEY (parent_id) REFERENCES records(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """)
        
        # 创建记录表索引
        cursor.execute("CREATE INDEX ix_records_parent_id ON records(parent_id)")
        cursor.execute("CREATE INDEX ix_records_user_id ON records(user_id)")
        cursor.execute("CREATE INDEX ix_records_status ON records(status)")
        cursor.execute("CREATE INDEX ix_records_category ON records(category)")
        
        # 创建示例数据
        print("创建示例数据...")
        from app.utils.random_id import RandomIDGenerator
        
        # 创建示例用户
        user_id = RandomIDGenerator.generate_user_id()
        cursor.execute("""
        INSERT INTO users (
            id, username, email, password_hash, first_name, last_name,
            is_active, is_verified, is_admin
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id, 'demo_user', 'demo@example.com',
            'pbkdf2:sha256:600000$demo$hash', 'Demo', 'User',
            1, 1, 0
        ))
        
        # 创建示例任务
        parent_task_id = RandomIDGenerator.generate_record_id()
        cursor.execute("""
        INSERT INTO records (
            id, content, category, user_id, priority, status, task_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            parent_task_id, '示例父任务', 'task', user_id,
            'high', 'active', 'work'
        ))
        
        # 创建子任务
        child_task_id = RandomIDGenerator.generate_record_id()
        cursor.execute("""
        INSERT INTO records (
            id, content, category, parent_id, user_id, priority, status, task_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            child_task_id, '示例子任务', 'task', parent_task_id, user_id,
            'medium', 'active', 'work'
        ))
        
        conn.commit()
        conn.close()
        
        print("SQLite数据库创建完成！")
        print(f"数据库路径: {db_path}")
        print(f"示例用户ID: {user_id}")
        print(f"示例父任务ID: {parent_task_id}")
        print(f"示例子任务ID: {child_task_id}")
        
        return True
        
    except Exception as e:
        print(f"SQLite数据库创建失败: {str(e)}")
        if 'conn' in locals():
            conn.close()
        return False

def create_fresh_postgresql_db():
    """创建全新的PostgreSQL数据库with随机ID"""
    print("创建全新PostgreSQL数据库...")
    
    try:
        from app import create_app
        from app.database import db
        from sqlalchemy import text
        from app.utils.random_id import RandomIDGenerator
        
        app = create_app()
        
        with app.app_context():
            print("删除现有表（如果存在）...")
            
            # 删除现有表
            try:
                db.session.execute(text("DROP TABLE IF EXISTS records CASCADE"))
                db.session.execute(text("DROP TABLE IF EXISTS users CASCADE"))
                db.session.commit()
            except Exception as e:
                print(f"删除现有表时出现警告: {e}")
                db.session.rollback()
            
            print("创建用户表...")
            db.session.execute(text("""
            CREATE TABLE users (
                id BIGINT PRIMARY KEY NOT NULL,
                username VARCHAR(80) UNIQUE NOT NULL,
                email VARCHAR(120) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                first_name VARCHAR(50),
                last_name VARCHAR(50),
                avatar_url VARCHAR(255),
                is_active BOOLEAN DEFAULT TRUE,
                is_verified BOOLEAN DEFAULT FALSE,
                is_admin BOOLEAN DEFAULT FALSE,
                failed_login_attempts INTEGER DEFAULT 0,
                last_failed_login TIMESTAMP,
                account_locked_until TIMESTAMP,
                refresh_token VARCHAR(255),
                refresh_token_expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                last_login_at TIMESTAMP
            )
            """))
            
            # 创建用户表索引
            db.session.execute(text("CREATE INDEX ix_users_username ON users(username)"))
            db.session.execute(text("CREATE INDEX ix_users_email ON users(email)"))
            
            print("创建记录表...")
            db.session.execute(text("""
            CREATE TABLE records (
                id BIGINT PRIMARY KEY NOT NULL,
                content TEXT NOT NULL,
                category VARCHAR(20) DEFAULT 'general',
                parent_id BIGINT REFERENCES records(id),
                user_id BIGINT REFERENCES users(id),
                priority VARCHAR(20) DEFAULT 'medium',
                progress INTEGER DEFAULT 0,
                progress_notes TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                status VARCHAR(20) DEFAULT 'active',
                task_type VARCHAR(20) DEFAULT 'work'
            )
            """))
            
            # 创建记录表索引
            db.session.execute(text("CREATE INDEX ix_records_parent_id ON records(parent_id)"))
            db.session.execute(text("CREATE INDEX ix_records_user_id ON records(user_id)"))
            db.session.execute(text("CREATE INDEX ix_records_status ON records(status)"))
            db.session.execute(text("CREATE INDEX ix_records_category ON records(category)"))
            
            # 创建示例数据
            print("创建示例数据...")
            
            # 创建示例用户
            user_id = RandomIDGenerator.generate_user_id()
            db.session.execute(text("""
            INSERT INTO users (
                id, username, email, password_hash, first_name, last_name,
                is_active, is_verified, is_admin
            ) VALUES (
                :id, :username, :email, :password_hash, :first_name, :last_name,
                :is_active, :is_verified, :is_admin
            )
            """), {
                'id': user_id,
                'username': 'demo_user',
                'email': 'demo@example.com',
                'password_hash': 'pbkdf2:sha256:600000$demo$hash',
                'first_name': 'Demo',
                'last_name': 'User',
                'is_active': True,
                'is_verified': True,
                'is_admin': False
            })
            
            # 创建示例任务
            parent_task_id = RandomIDGenerator.generate_record_id()
            db.session.execute(text("""
            INSERT INTO records (
                id, content, category, user_id, priority, status, task_type
            ) VALUES (
                :id, :content, :category, :user_id, :priority, :status, :task_type
            )
            """), {
                'id': parent_task_id,
                'content': '示例父任务',
                'category': 'task',
                'user_id': user_id,
                'priority': 'high',
                'status': 'active',
                'task_type': 'work'
            })
            
            # 创建子任务
            child_task_id = RandomIDGenerator.generate_record_id()
            db.session.execute(text("""
            INSERT INTO records (
                id, content, category, parent_id, user_id, priority, status, task_type
            ) VALUES (
                :id, :content, :category, :parent_id, :user_id, :priority, :status, :task_type
            )
            """), {
                'id': child_task_id,
                'content': '示例子任务',
                'category': 'task',
                'parent_id': parent_task_id,
                'user_id': user_id,
                'priority': 'medium',
                'status': 'active',
                'task_type': 'work'
            })
            
            db.session.commit()
            
            print("PostgreSQL数据库创建完成！")
            print(f"示例用户ID: {user_id}")
            print(f"示例父任务ID: {parent_task_id}")
            print(f"示例子任务ID: {child_task_id}")
            
            return True
            
    except Exception as e:
        print(f"PostgreSQL数据库创建失败: {str(e)}")
        return False

def main():
    """主函数：根据数据库类型创建全新的随机ID数据库"""
    print("开始创建全新的随机ID数据库...")
    print("=" * 50)
    
    # 检测数据库类型
    database_url = os.getenv('DATABASE_URL')
    db_type = detect_database_type(database_url)
    
    print(f"检测到数据库类型: {db_type}")
    print(f"数据库URL: {database_url}")
    
    success = False
    
    if db_type == 'sqlite':
        success = create_fresh_sqlite_db()
    elif db_type == 'postgresql':
        success = create_fresh_postgresql_db()
    else:
        print(f"不支持的数据库类型: {db_type}")
        return False
    
    if success:
        print("=" * 50)
        print("✅ 全新数据库创建成功！")
        print("特性：")
        print("1. 所有用户和任务使用48位随机ID")
        print("2. 支持父子任务关系")
        print("3. 包含示例数据用于测试")
        print("4. 数据局部性安全问题已解决")
        print("5. 完全兼容现有导入导出功能")
    else:
        print("=" * 50)
        print("❌ 数据库创建失败")
        return False
    
    return success

if __name__ == "__main__":
    main()