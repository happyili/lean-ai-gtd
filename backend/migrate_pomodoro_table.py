#!/usr/bin/env python3
"""
番茄任务表迁移脚本
为现有数据库添加番茄任务表
"""

import os
import sys
import sqlite3
import time
from pathlib import Path

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
        return 'sqlite'

def migrate_sqlite_pomodoro_table():
    """SQLite数据库添加番茄任务表"""
    print("为SQLite数据库添加番茄任务表...")
    
    # 数据库文件路径
    db_path = project_root.parent / "data" / "aigtd.db"
    
    if not db_path.exists():
        print("SQLite数据库文件不存在，跳过迁移")
        return True
    
    try:
        # 连接数据库
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # 检查表是否已存在
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='pomodoro_tasks'
        """)
        
        if cursor.fetchone():
            print("番茄任务表已存在，跳过创建")
            conn.close()
            return True
        
        print("创建番茄任务表...")
        
        # 创建番茄任务表
        cursor.execute("""
        CREATE TABLE pomodoro_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            related_task_ids TEXT,
            priority_score INTEGER DEFAULT 0,
            estimated_pomodoros INTEGER DEFAULT 1,
            order_index INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            started_at TEXT,
            completed_at TEXT,
            pomodoros_completed INTEGER DEFAULT 0,
            total_focus_time INTEGER DEFAULT 0,
            generation_context TEXT,
            ai_reasoning TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
        """)
        
        # 创建索引
        cursor.execute("CREATE INDEX idx_pomodoro_tasks_user_id ON pomodoro_tasks(user_id)")
        cursor.execute("CREATE INDEX idx_pomodoro_tasks_status ON pomodoro_tasks(status)")
        cursor.execute("CREATE INDEX idx_pomodoro_tasks_order ON pomodoro_tasks(user_id, order_index)")
        cursor.execute("CREATE INDEX idx_pomodoro_tasks_created_at ON pomodoro_tasks(created_at)")
        
        # 创建更新时间戳触发器
        cursor.execute("""
        CREATE TRIGGER update_pomodoro_tasks_updated_at
            AFTER UPDATE ON pomodoro_tasks
            FOR EACH ROW
            WHEN OLD.updated_at = NEW.updated_at OR NEW.updated_at IS NULL
        BEGIN
            UPDATE pomodoro_tasks SET updated_at = datetime('now') WHERE id = NEW.id;
        END
        """)
        
        conn.commit()
        conn.close()
        
        print("SQLite番茄任务表创建完成！")
        return True
        
    except Exception as e:
        print(f"SQLite番茄任务表创建失败: {str(e)}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False

def migrate_postgresql_pomodoro_table():
    """PostgreSQL数据库添加番茄任务表"""
    print("为PostgreSQL数据库添加番茄任务表...")
    
    try:
        from app import create_app
        from app.database import db
        from sqlalchemy import text
        
        app = create_app()
        
        with app.app_context():
            # 检查表是否已存在
            result = db.session.execute(text("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'pomodoro_tasks'
            """)).fetchone()
            
            if result:
                print("番茄任务表已存在，跳过创建")
                return True
            
            print("创建番茄任务表...")
            
            # 创建番茄任务表 - 使用自增ID而不是随机ID
            db.session.execute(text("""
            CREATE TABLE pomodoro_tasks (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(id),
                title VARCHAR(200) NOT NULL,
                description TEXT,
                related_task_ids TEXT,
                priority_score INTEGER DEFAULT 0,
                estimated_pomodoros INTEGER DEFAULT 1,
                order_index INTEGER NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                pomodoros_completed INTEGER DEFAULT 0,
                total_focus_time INTEGER DEFAULT 0,
                generation_context TEXT,
                ai_reasoning TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
            """))
            
            # 创建索引
            db.session.execute(text("CREATE INDEX idx_pomodoro_tasks_user_id ON pomodoro_tasks(user_id)"))
            db.session.execute(text("CREATE INDEX idx_pomodoro_tasks_status ON pomodoro_tasks(status)"))
            db.session.execute(text("CREATE INDEX idx_pomodoro_tasks_order ON pomodoro_tasks(user_id, order_index)"))
            db.session.execute(text("CREATE INDEX idx_pomodoro_tasks_created_at ON pomodoro_tasks(created_at)"))
            
            # 创建更新时间戳触发器
            db.session.execute(text("""
            CREATE OR REPLACE FUNCTION update_pomodoro_tasks_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql
            """))
            
            db.session.execute(text("""
            CREATE TRIGGER update_pomodoro_tasks_updated_at
                BEFORE UPDATE ON pomodoro_tasks
                FOR EACH ROW
                EXECUTE FUNCTION update_pomodoro_tasks_updated_at()
            """))
            
            db.session.commit()
            
            print("PostgreSQL番茄任务表创建完成！")
            return True
            
    except Exception as e:
        print(f"PostgreSQL番茄任务表创建失败: {str(e)}")
        return False

def main():
    """主函数：根据数据库类型添加番茄任务表"""
    print("开始添加番茄任务表...")
    print("=" * 50)
    
    # 检测数据库类型
    database_url = os.getenv('DATABASE_URL')
    db_type = detect_database_type(database_url)
    
    print(f"检测到数据库类型: {db_type}")
    print(f"数据库URL: {database_url}")
    
    success = False
    
    if db_type == 'sqlite':
        success = migrate_sqlite_pomodoro_table()
    elif db_type == 'postgresql':
        success = migrate_postgresql_pomodoro_table()
    else:
        print(f"不支持的数据库类型: {db_type}")
        return False
    
    if success:
        print("=" * 50)
        print("✅ 番茄任务表添加成功！")
        print("功能特性：")
        print("1. 支持AI生成的番茄任务存储")
        print("2. 记录任务执行状态和统计")
        print("3. 关联原始任务的映射关系")
        print("4. 支持优先级排序和进度追踪")
        print("5. 自动时间戳更新")
    else:
        print("=" * 50)
        print("❌ 番茄任务表添加失败")
        return False
    
    return success

if __name__ == "__main__":
    main()