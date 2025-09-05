#!/usr/bin/env python3
"""
数据库迁移脚本 - 添加优先级和进度字段
为现有的Record表添加priority和progress字段
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
        
        # 检查priority字段是否已存在
        cursor.execute("PRAGMA table_info(records)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'priority' in columns and 'progress' in columns:
            print("priority和progress字段已存在，跳过迁移")
            conn.close()
            return
        
        print("添加priority和progress字段...")
        
        # 添加priority字段
        if 'priority' not in columns:
            cursor.execute("ALTER TABLE records ADD COLUMN priority VARCHAR(20) DEFAULT 'medium'")
        
        # 添加progress字段
        if 'progress' not in columns:
            cursor.execute("ALTER TABLE records ADD COLUMN progress INTEGER DEFAULT 0")
        
        conn.commit()
        conn.close()
        print("数据库迁移完成！")
        
    except Exception as e:
        print(f"迁移失败: {str(e)}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        raise

if __name__ == "__main__":
    migrate_database()
    print("迁移完成！")
