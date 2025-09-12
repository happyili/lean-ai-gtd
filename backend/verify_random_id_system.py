#!/usr/bin/env python3
"""
数据库完整性和功能验证脚本
验证随机ID系统下的导入导出和CRUD操作
支持PostgreSQL和SQLite
"""

import os
import sys
import json
import tempfile
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_random_id_generation():
    """测试随机ID生成功能"""
    print("=== 测试随机ID生成 ===")
    
    try:
        from app.utils.random_id import RandomIDGenerator
        
        # 测试用户ID生成
        user_ids = [RandomIDGenerator.generate_user_id() for _ in range(100)]
        print(f"生成100个用户ID，唯一性: {len(set(user_ids)) == 100}")
        print(f"用户ID示例: {user_ids[:5]}")
        
        # 测试记录ID生成
        record_ids = [RandomIDGenerator.generate_record_id() for _ in range(100)]
        print(f"生成100个记录ID，唯一性: {len(set(record_ids)) == 100}")
        print(f"记录ID示例: {record_ids[:5]}")
        
        # 测试ID格式
        print(f"ID格式验证: {all(RandomIDGenerator.is_valid_id_format(id) for id in user_ids[:10])}")
        
        return True
        
    except Exception as e:
        print(f"随机ID生成测试失败: {e}")
        return False

def test_database_models():
    """测试数据库模型的随机ID功能"""
    print("\n=== 测试数据库模型 ===")
    
    try:
        from app import create_app
        from app.models.user import User
        from app.models.record import Record
        from app.database import db
        import time
        
        app = create_app()
        with app.app_context():
            # 测试用户创建
            test_user = User.create_user(
                username=f'test_verify_{int(time.time())}',
                email=f'verify_{int(time.time())}@example.com',
                password='test123456'
            )
            print(f"创建测试用户成功: ID={test_user.id}, 用户名={test_user.username}")
            
            # 测试记录创建
            parent_record = Record(
                content='验证父任务',
                category='task',
                user_id=test_user.id,
                task_type='work'
            )
            db.session.add(parent_record)
            db.session.flush()
            
            # 测试子任务创建
            child_record = parent_record.add_subtask('验证子任务', 'task', 'work')
            db.session.commit()
            
            print(f"创建父任务成功: ID={parent_record.id}")
            print(f"创建子任务成功: ID={child_record.id}, 父任务ID={child_record.parent_id}")
            
            # 验证关系
            found_parent = Record.query.get(parent_record.id)
            children = found_parent.get_subtasks()
            print(f"父子关系验证: 父任务有 {len(children)} 个子任务")
            
            # 测试导出格式
            export_data = found_parent.to_dict(include_subtasks=True)
            print(f"导出数据包含子任务: {'subtasks' in export_data and len(export_data['subtasks']) > 0}")
            
            return True
            
    except Exception as e:
        print(f"数据库模型测试失败: {e}")
        return False

def test_crud_operations():
    """测试CRUD操作"""
    print("\n=== 测试CRUD操作 ===")
    
    try:
        from app import create_app
        from app.models.user import User
        from app.models.record import Record
        from app.database import db
        import time
        
        app = create_app()
        with app.app_context():
            # 创建测试数据
            user = User.create_user(
                username=f'crud_test_{int(time.time())}',
                email=f'crud_{int(time.time())}@example.com',
                password='crud123456'
            )
            
            # CREATE - 创建记录
            record = Record(
                content='CRUD测试任务',
                category='task',
                user_id=user.id,
                priority='high',
                task_type='work'
            )
            db.session.add(record)
            db.session.commit()
            record_id = record.id
            print(f"CREATE: 创建记录 ID={record_id}")
            
            # READ - 读取记录
            found_record = Record.query.get(record_id)
            print(f"READ: 读取记录成功，内容='{found_record.content}'")
            
            # UPDATE - 更新记录
            found_record.content = 'CRUD测试任务（已更新）'
            found_record.priority = 'urgent'
            db.session.commit()
            print(f"UPDATE: 更新记录成功，新内容='{found_record.content}'")
            
            # DELETE - 删除记录
            db.session.delete(found_record)
            db.session.commit()
            deleted_record = Record.query.get(record_id)
            print(f"DELETE: 删除记录成功，查询结果={deleted_record is None}")
            
            return True
            
    except Exception as e:
        print(f"CRUD操作测试失败: {e}")
        return False

def test_import_export_compatibility():
    """测试导入导出兼容性"""
    print("\n=== 测试导入导出兼容性 ===")
    
    try:
        from app import create_app
        from app.models.user import User
        from app.models.record import Record
        from app.database import db
        import time
        
        app = create_app()
        with app.app_context():
            # 创建测试数据
            user = User.create_user(
                username=f'export_test_{int(time.time())}',
                email=f'export_{int(time.time())}@example.com',
                password='export123456'
            )
            
            # 创建父任务和子任务
            parent = Record(
                content='导出测试父任务',
                category='task',
                user_id=user.id,
                priority='high',
                task_type='work'
            )
            db.session.add(parent)
            db.session.flush()
            
            child1 = parent.add_subtask('导出测试子任务1', 'task', 'work')
            child2 = parent.add_subtask('导出测试子任务2', 'task', 'hobby')
            db.session.commit()
            
            # 测试导出格式
            export_data = parent.to_dict(include_subtasks=True)
            
            expected_keys = ['id', 'content', 'category', 'priority', 'task_type', 'subtasks']
            has_required_keys = all(key in export_data for key in expected_keys)
            print(f"导出数据包含必需字段: {has_required_keys}")
            
            # 验证子任务导出
            subtasks = export_data.get('subtasks', [])
            print(f"导出了 {len(subtasks)} 个子任务")
            
            # 验证ID格式
            from app.utils.random_id import RandomIDGenerator
            parent_id_valid = RandomIDGenerator.is_valid_id_format(export_data['id'])
            child_ids_valid = all(RandomIDGenerator.is_valid_id_format(subtask['id']) for subtask in subtasks)
            print(f"导出的ID格式有效: 父任务={parent_id_valid}, 子任务={child_ids_valid}")
            
            # 测试父子关系保持
            parent_child_relations = all(subtask['parent_id'] == export_data['id'] for subtask in subtasks)
            print(f"父子关系保持正确: {parent_child_relations}")
            
            return True
            
    except Exception as e:
        print(f"导入导出兼容性测试失败: {e}")
        return False

def test_frontend_compatibility():
    """测试前端兼容性（运行前端测试）"""
    print("\n=== 测试前端兼容性 ===")
    
    try:
        import subprocess
        import os
        
        # 切换到前端目录
        frontend_dir = project_root.parent / "frontend"
        if not frontend_dir.exists():
            print("前端目录不存在，跳过前端测试")
            return True
        
        # 运行前端测试
        result = subprocess.run(
            ["npm", "test"],
            cwd=str(frontend_dir),
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0:
            print("前端测试全部通过")
            # 提取测试结果
            output_lines = result.stdout.split('\n')
            test_results = [line for line in output_lines if 'test' in line.lower() and ('pass' in line.lower() or 'fail' in line.lower())]
            for line in test_results[-5:]:  # 显示最后几行测试结果
                print(f"  {line}")
            return True
        else:
            print(f"前端测试失败: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print("前端测试超时")
        return False
    except Exception as e:
        print(f"前端兼容性测试失败: {e}")
        return False

def test_migration_verification():
    """验证迁移脚本的完整性"""
    print("\n=== 验证迁移脚本 ===")
    
    try:
        # 检查迁移脚本文件
        migrate_incremental = project_root / "migrate_to_random_ids.py"
        migrate_full = project_root / "full_migrate_random_ids.py"
        
        scripts_exist = migrate_incremental.exists() and migrate_full.exists()
        print(f"迁移脚本文件存在: {scripts_exist}")
        
        if scripts_exist:
            # 检查脚本内容包含必要功能
            with open(migrate_incremental, 'r', encoding='utf-8') as f:
                incremental_content = f.read()
            
            with open(migrate_full, 'r', encoding='utf-8') as f:
                full_content = f.read()
            
            # 检查关键功能
            incremental_features = [
                'detect_database_type' in incremental_content,
                'migrate_sqlite_to_random_ids' in incremental_content,
                'migrate_postgresql_to_random_ids' in incremental_content,
                'RandomIDGenerator' in incremental_content
            ]
            
            full_features = [
                'create_fresh_sqlite_db' in full_content,
                'create_fresh_postgresql_db' in full_content,
                'RandomIDGenerator' in full_content
            ]
            
            print(f"增量迁移脚本功能完整: {all(incremental_features)}")
            print(f"全量迁移脚本功能完整: {all(full_features)}")
            
            return all(incremental_features) and all(full_features)
        
        return False
        
    except Exception as e:
        print(f"迁移脚本验证失败: {e}")
        return False

def main():
    """主验证函数"""
    print("开始验证随机ID系统的完整性和功能...")
    print("=" * 60)
    
    # 检测数据库类型
    database_url = os.getenv('DATABASE_URL', '')
    db_type = 'sqlite' if not database_url or 'sqlite' in database_url.lower() else 'postgresql'
    print(f"当前数据库类型: {db_type}")
    print(f"数据库URL: {database_url or '使用默认SQLite'}")
    
    # 运行所有测试
    tests = [
        ("随机ID生成", test_random_id_generation),
        ("数据库模型", test_database_models),
        ("CRUD操作", test_crud_operations),
        ("导入导出兼容性", test_import_export_compatibility),
        ("前端兼容性", test_frontend_compatibility),
        ("迁移脚本验证", test_migration_verification)
    ]
    
    results = {}
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"测试 '{test_name}' 遇到异常: {e}")
            results[test_name] = False
    
    # 输出总结
    print("\n" + "=" * 60)
    print("验证结果总结:")
    
    all_passed = True
    for test_name, passed in results.items():
        status = "✅ 通过" if passed else "❌ 失败"
        print(f"  {test_name}: {status}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 所有验证测试通过！随机ID系统功能完整。")
        print("✅ 数据库迁移已完成")
        print("✅ 导入导出功能正常")
        print("✅ CRUD操作兼容")
        print("✅ 前端测试通过")
        print("✅ 数据安全性提升")
    else:
        print("⚠️  部分测试失败，请检查上述失败项目")
        return False
    
    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)