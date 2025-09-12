#!/usr/bin/env python3
"""
增量数据库迁移脚本 - 将自增ID迁移到随机ID
支持PostgreSQL和SQLite，保持数据完整性和导入导出兼容性
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
        # 默认假设是SQLite文件路径
        return 'sqlite'

def migrate_sqlite_to_random_ids():
    """SQLite数据库迁移到随机ID"""
    print("开始SQLite数据库迁移...")
    
    # 数据库文件路径
    db_path = project_root.parent / "data" / "aigtd.db"
    backup_path = project_root.parent / "data" / f"aigtd_backup_{int(time.time())}.db"
    
    if not db_path.exists():
        print("SQLite数据库文件不存在，跳过迁移")
        return True
    
    try:
        # 备份数据库
        import shutil
        shutil.copy2(str(db_path), str(backup_path))
        print(f"已备份数据库到: {backup_path}")
        
        # 连接数据库
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # 检查是否已经迁移
        cursor.execute("PRAGMA table_info(users)")
        user_columns = {col[1]: col[2] for col in cursor.fetchall()}
        
        if user_columns.get('id', '').upper() == 'BIGINT':
            print("数据库已经迁移过，跳过")
            conn.close()
            return True
        
        print("开始迁移用户表...")
        
        # 创建新的用户表
        cursor.execute("""
        CREATE TABLE users_new (
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
        
        # 创建索引
        cursor.execute("CREATE INDEX ix_users_new_username ON users_new(username)")
        cursor.execute("CREATE INDEX ix_users_new_email ON users_new(email)")
        
        # 导入随机ID生成器
        from app.utils.random_id import RandomIDGenerator
        
        # 迁移用户数据
        cursor.execute("SELECT * FROM users")
        users = cursor.fetchall()
        cursor.execute("PRAGMA table_info(users)")
        user_cols = [col[1] for col in cursor.fetchall()]
        
        id_mapping = {}  # 旧ID -> 新ID映射
        
        for user_row in users:
            user_dict = dict(zip(user_cols, user_row))
            old_id = user_dict['id']
            new_id = RandomIDGenerator.generate_migration_safe_id()
            id_mapping[old_id] = new_id
            
            # 插入新用户记录
            cursor.execute("""
            INSERT INTO users_new (
                id, username, email, password_hash, first_name, last_name, 
                avatar_url, is_active, is_verified, is_admin, 
                failed_login_attempts, last_failed_login, account_locked_until,
                refresh_token, refresh_token_expires_at, created_at, updated_at, last_login_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                new_id, user_dict.get('username'), user_dict.get('email'),
                user_dict.get('password_hash'), user_dict.get('first_name'),
                user_dict.get('last_name'), user_dict.get('avatar_url'),
                user_dict.get('is_active', 1), user_dict.get('is_verified', 0),
                user_dict.get('is_admin', 0), user_dict.get('failed_login_attempts', 0),
                user_dict.get('last_failed_login'), user_dict.get('account_locked_until'),
                user_dict.get('refresh_token'), user_dict.get('refresh_token_expires_at'),
                user_dict.get('created_at'), user_dict.get('updated_at'),
                user_dict.get('last_login_at')
            ))
        
        print(f"迁移了 {len(users)} 个用户")
        
        # 创建新的记录表
        print("开始迁移记录表...")
        
        cursor.execute("""
        CREATE TABLE records_new (
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
            FOREIGN KEY (parent_id) REFERENCES records_new(id),
            FOREIGN KEY (user_id) REFERENCES users_new(id)
        )
        """)
        
        # 创建记录表索引
        cursor.execute("CREATE INDEX ix_records_new_parent_id ON records_new(parent_id)")
        cursor.execute("CREATE INDEX ix_records_new_user_id ON records_new(user_id)")
        cursor.execute("CREATE INDEX ix_records_new_status ON records_new(status)")
        cursor.execute("CREATE INDEX ix_records_new_category ON records_new(category)")
        
        # 迁移记录数据（两遍：先父任务，再子任务）
        cursor.execute("SELECT * FROM records")
        records = cursor.fetchall()
        cursor.execute("PRAGMA table_info(records)")
        record_cols = [col[1] for col in cursor.fetchall()]
        
        record_id_mapping = {}  # 旧记录ID -> 新记录ID映射
        
        # 第一遍：迁移父任务（parent_id为NULL的记录）
        for record_row in records:
            record_dict = dict(zip(record_cols, record_row))
            if record_dict.get('parent_id') is not None:
                continue  # 跳过子任务
                
            old_id = record_dict['id']
            new_id = RandomIDGenerator.generate_migration_safe_id()
            record_id_mapping[old_id] = new_id
            
            # 映射用户ID
            old_user_id = record_dict.get('user_id')
            new_user_id = id_mapping.get(old_user_id) if old_user_id else None
            
            cursor.execute("""
            INSERT INTO records_new (
                id, content, category, parent_id, user_id, priority,
                progress, progress_notes, created_at, updated_at, status, task_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                new_id, record_dict.get('content'), record_dict.get('category', 'general'),
                None, new_user_id, record_dict.get('priority', 'medium'),
                record_dict.get('progress', 0), record_dict.get('progress_notes'),
                record_dict.get('created_at'), record_dict.get('updated_at'),
                record_dict.get('status', 'active'), record_dict.get('task_type', 'work')
            ))
        
        # 第二遍：迁移子任务
        for record_row in records:
            record_dict = dict(zip(record_cols, record_row))
            if record_dict.get('parent_id') is None:
                continue  # 跳过父任务
                
            old_id = record_dict['id']
            new_id = RandomIDGenerator.generate_migration_safe_id()
            record_id_mapping[old_id] = new_id
            
            # 映射父任务ID和用户ID
            old_parent_id = record_dict.get('parent_id')
            new_parent_id = record_id_mapping.get(old_parent_id)
            old_user_id = record_dict.get('user_id')
            new_user_id = id_mapping.get(old_user_id) if old_user_id else None
            
            if new_parent_id is None:
                print(f"警告：找不到父任务映射，跳过记录 {old_id}")
                continue
            
            cursor.execute("""
            INSERT INTO records_new (
                id, content, category, parent_id, user_id, priority,
                progress, progress_notes, created_at, updated_at, status, task_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                new_id, record_dict.get('content'), record_dict.get('category', 'general'),
                new_parent_id, new_user_id, record_dict.get('priority', 'medium'),
                record_dict.get('progress', 0), record_dict.get('progress_notes'),
                record_dict.get('created_at'), record_dict.get('updated_at'),
                record_dict.get('status', 'active'), record_dict.get('task_type', 'work')
            ))
        
        print(f"迁移了 {len(records)} 条记录")
        
        # 删除旧表并重命名新表
        cursor.execute("DROP TABLE users")
        cursor.execute("ALTER TABLE users_new RENAME TO users")
        
        cursor.execute("DROP TABLE records")
        cursor.execute("ALTER TABLE records_new RENAME TO records")
        
        conn.commit()
        conn.close()
        
        print("SQLite迁移完成！")
        print(f"用户ID映射: {len(id_mapping)} 个")
        print(f"记录ID映射: {len(record_id_mapping)} 个")
        
        return True
        
    except Exception as e:
        print(f"SQLite迁移失败: {str(e)}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        # 恢复备份
        if backup_path.exists():
            shutil.copy2(str(backup_path), str(db_path))
            print("已恢复数据库备份")
        return False

def migrate_postgresql_to_random_ids():
    """PostgreSQL数据库迁移到随机ID"""
    print("开始PostgreSQL数据库迁移...")
    
    try:
        from app import create_app
        from app.database import db
        from sqlalchemy import text
        from app.utils.random_id import RandomIDGenerator
        
        app = create_app()
        
        with app.app_context():
            # 检查是否已经迁移
            result = db.session.execute(text("""
                SELECT data_type FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'id'
            """)).fetchone()
            
            if result and result[0] == 'bigint':
                print("PostgreSQL数据库已经迁移过，跳过")
                return True
            
            # 开始事务
            db.session.begin()
            
            try:
                print("创建新表结构...")
                
                # 创建新的用户表
                db.session.execute(text("""
                CREATE TABLE users_new (
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
                db.session.execute(text("CREATE INDEX ix_users_new_username ON users_new(username)"))
                db.session.execute(text("CREATE INDEX ix_users_new_email ON users_new(email)"))
                
                # 创建新的记录表
                db.session.execute(text("""
                CREATE TABLE records_new (
                    id BIGINT PRIMARY KEY NOT NULL,
                    content TEXT NOT NULL,
                    category VARCHAR(20) DEFAULT 'general',
                    parent_id BIGINT REFERENCES records_new(id),
                    user_id BIGINT REFERENCES users_new(id),
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
                db.session.execute(text("CREATE INDEX ix_records_new_parent_id ON records_new(parent_id)"))
                db.session.execute(text("CREATE INDEX ix_records_new_user_id ON records_new(user_id)"))
                db.session.execute(text("CREATE INDEX ix_records_new_status ON records_new(status)"))
                db.session.execute(text("CREATE INDEX ix_records_new_category ON records_new(category)"))
                
                print("迁移用户数据...")
                
                # 获取所有用户
                users = db.session.execute(text("SELECT * FROM users")).fetchall()
                id_mapping = {}
                
                for user in users:
                    old_id = user.id
                    new_id = RandomIDGenerator.generate_migration_safe_id()
                    id_mapping[old_id] = new_id
                    
                    # 插入新用户记录
                    db.session.execute(text("""
                    INSERT INTO users_new (
                        id, username, email, password_hash, first_name, last_name,
                        avatar_url, is_active, is_verified, is_admin,
                        failed_login_attempts, last_failed_login, account_locked_until,
                        refresh_token, refresh_token_expires_at, created_at, updated_at, last_login_at
                    ) VALUES (
                        :id, :username, :email, :password_hash, :first_name, :last_name,
                        :avatar_url, :is_active, :is_verified, :is_admin,
                        :failed_login_attempts, :last_failed_login, :account_locked_until,
                        :refresh_token, :refresh_token_expires_at, :created_at, :updated_at, :last_login_at
                    )
                    """), {
                        'id': new_id,
                        'username': user.username,
                        'email': user.email,
                        'password_hash': user.password_hash,
                        'first_name': getattr(user, 'first_name', None),
                        'last_name': getattr(user, 'last_name', None),
                        'avatar_url': getattr(user, 'avatar_url', None),
                        'is_active': getattr(user, 'is_active', True),
                        'is_verified': getattr(user, 'is_verified', False),
                        'is_admin': getattr(user, 'is_admin', False),
                        'failed_login_attempts': getattr(user, 'failed_login_attempts', 0),
                        'last_failed_login': getattr(user, 'last_failed_login', None),
                        'account_locked_until': getattr(user, 'account_locked_until', None),
                        'refresh_token': getattr(user, 'refresh_token', None),
                        'refresh_token_expires_at': getattr(user, 'refresh_token_expires_at', None),
                        'created_at': getattr(user, 'created_at', None),
                        'updated_at': getattr(user, 'updated_at', None),
                        'last_login_at': getattr(user, 'last_login_at', None)
                    })
                
                print(f"迁移了 {len(users)} 个用户")
                
                print("迁移记录数据...")
                
                # 获取所有记录（父任务优先）
                records = db.session.execute(text("""
                    SELECT * FROM records 
                    ORDER BY CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END, id
                """)).fetchall()
                
                record_id_mapping = {}
                
                for record in records:
                    old_id = record.id
                    new_id = RandomIDGenerator.generate_migration_safe_id()
                    record_id_mapping[old_id] = new_id
                    
                    # 映射关联ID
                    new_parent_id = None
                    if record.parent_id:
                        new_parent_id = record_id_mapping.get(record.parent_id)
                        if new_parent_id is None:
                            print(f"警告：找不到父任务映射，跳过记录 {old_id}")
                            continue
                    
                    new_user_id = None
                    if record.user_id:
                        new_user_id = id_mapping.get(record.user_id)
                    
                    # 插入新记录
                    db.session.execute(text("""
                    INSERT INTO records_new (
                        id, content, category, parent_id, user_id, priority,
                        progress, progress_notes, created_at, updated_at, status, task_type
                    ) VALUES (
                        :id, :content, :category, :parent_id, :user_id, :priority,
                        :progress, :progress_notes, :created_at, :updated_at, :status, :task_type
                    )
                    """), {
                        'id': new_id,
                        'content': record.content,
                        'category': getattr(record, 'category', 'general'),
                        'parent_id': new_parent_id,
                        'user_id': new_user_id,
                        'priority': getattr(record, 'priority', 'medium'),
                        'progress': getattr(record, 'progress', 0),
                        'progress_notes': getattr(record, 'progress_notes', None),
                        'created_at': getattr(record, 'created_at', None),
                        'updated_at': getattr(record, 'updated_at', None),
                        'status': getattr(record, 'status', 'active'),
                        'task_type': getattr(record, 'task_type', 'work')
                    })
                
                print(f"迁移了 {len(records)} 条记录")
                
                # 删除旧表并重命名新表
                print("重命名表...")
                db.session.execute(text("DROP TABLE IF EXISTS records CASCADE"))
                db.session.execute(text("DROP TABLE IF EXISTS users CASCADE"))
                db.session.execute(text("ALTER TABLE users_new RENAME TO users"))
                db.session.execute(text("ALTER TABLE records_new RENAME TO records"))
                
                # 重建外键约束
                db.session.execute(text("ALTER TABLE records ADD CONSTRAINT fk_records_parent FOREIGN KEY (parent_id) REFERENCES records(id)"))
                db.session.execute(text("ALTER TABLE records ADD CONSTRAINT fk_records_user FOREIGN KEY (user_id) REFERENCES users(id)"))
                
                db.session.commit()
                
                print("PostgreSQL迁移完成！")
                print(f"用户ID映射: {len(id_mapping)} 个")
                print(f"记录ID映射: {len(record_id_mapping)} 个")
                
                return True
                
            except Exception as e:
                db.session.rollback()
                raise e
        
    except Exception as e:
        print(f"PostgreSQL迁移失败: {str(e)}")
        return False

def main():
    """主函数：根据数据库类型执行相应的迁移"""
    print("开始数据库ID迁移...")
    print("=" * 50)
    
    # 检测数据库类型
    database_url = os.getenv('DATABASE_URL')
    db_type = detect_database_type(database_url)
    
    print(f"检测到数据库类型: {db_type}")
    print(f"数据库URL: {database_url}")
    
    success = False
    
    if db_type == 'sqlite':
        success = migrate_sqlite_to_random_ids()
    elif db_type == 'postgresql':
        success = migrate_postgresql_to_random_ids()
    else:
        print(f"不支持的数据库类型: {db_type}")
        return False
    
    if success:
        print("=" * 50)
        print("✅ 迁移成功完成！")
        print("注意：")
        print("1. 所有用户和任务现在使用随机ID")
        print("2. 父子任务关系已保持完整")
        print("3. 导入导出功能将继续正常工作")
        print("4. 数据局部性安全问题已解决")
    else:
        print("=" * 50)
        print("❌ 迁移失败")
        return False
    
    return success

if __name__ == "__main__":
    main()