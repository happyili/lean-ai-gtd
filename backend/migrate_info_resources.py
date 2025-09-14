#!/usr/bin/env python3
"""
信息资源表迁移脚本
创建 info_resources 表
"""

import os
import sys
from datetime import datetime

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.database import db
from app.models.info_resource import InfoResource

def migrate_info_resources():
    """创建信息资源表"""
    app = create_app()
    
    with app.app_context():
        try:
            print("🔄 开始创建信息资源表...")
            
            # 检查表是否已存在
            inspector = db.inspect(db.engine)
            existing_tables = inspector.get_table_names()
            
            if 'info_resources' in existing_tables:
                print("⚠️  信息资源表已存在，跳过创建")
                return True
            
            # 创建表
            InfoResource.__table__.create(db.engine)
            print("✅ 信息资源表创建成功")
            
            # 验证表结构
            columns = inspector.get_columns('info_resources')
            print(f"📋 表结构验证: {len(columns)} 个字段")
            for col in columns:
                print(f"   - {col['name']}: {col['type']}")
            
            return True
            
        except Exception as e:
            print(f"❌ 创建信息资源表失败: {str(e)}")
            return False

def rollback_info_resources():
    """回滚信息资源表"""
    app = create_app()
    
    with app.app_context():
        try:
            print("🔄 开始删除信息资源表...")
            
            # 检查表是否存在
            inspector = db.inspect(db.engine)
            existing_tables = inspector.get_table_names()
            
            if 'info_resources' not in existing_tables:
                print("⚠️  信息资源表不存在，无需删除")
                return True
            
            # 删除表
            InfoResource.__table__.drop(db.engine)
            print("✅ 信息资源表删除成功")
            
            return True
            
        except Exception as e:
            print(f"❌ 删除信息资源表失败: {str(e)}")
            return False

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='信息资源表迁移脚本')
    parser.add_argument('--rollback', action='store_true', help='回滚迁移')
    
    args = parser.parse_args()
    
    if args.rollback:
        success = rollback_info_resources()
    else:
        success = migrate_info_resources()
    
    if success:
        print("🎉 迁移操作完成")
        sys.exit(0)
    else:
        print("💥 迁移操作失败")
        sys.exit(1)
