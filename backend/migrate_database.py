#!/usr/bin/env python3
"""
数据库迁移脚本 - 添加子任务支持
为现有的Record表添加parent_id字段，支持任务层级关系
"""

import os
import sys
import sqlite3
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def migrate_database():
    """执行数据库迁移"""
    # 数据库文件路径
    db_path = project_root.parent / "data" / "aigtd.db"
    
    if not db_path.exists():
        print("数据库文件不存在，无需迁移")
        return
    
    try:
        print("开始数据库迁移...")
        
        # 连接数据库
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # 检查parent_id字段是否已存在
        cursor.execute("PRAGMA table_info(records)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'parent_id' in columns:
            print("parent_id字段已存在，跳过迁移")
            conn.close()
            return
        
        print("添加parent_id字段...")
        
        # 添加parent_id字段
        cursor.execute("ALTER TABLE records ADD COLUMN parent_id INTEGER")
        
        # 创建索引
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_records_parent_id ON records(parent_id)")
        
        conn.commit()
        conn.close()
        print("数据库迁移完成！")
        
    except Exception as e:
        print(f"迁移失败: {str(e)}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        raise

def test_migration():
    """测试迁移结果"""
    try:
        # 修正导入路径
        sys.path.insert(0, str(project_root))
        from app import create_app
        from app.models.record import Record
        
        app = create_app()
        
        with app.app_context():
            # 测试查询
            records = Record.query.all()
            print(f"找到 {len(records)} 条记录")
            
            # 测试新字段
            for record in records[:3]:  # 只检查前3条
                print(f"记录 {record.id}: parent_id = {record.parent_id}")
                
    except Exception as e:
        print(f"测试失败: {str(e)}")
        raise

if __name__ == "__main__":
    migrate_database()
    test_migration()
    print("迁移和测试完成！")