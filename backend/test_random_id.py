#!/usr/bin/env python3
"""
Test script for random ID functionality
Tests both User and Record models with random IDs
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.models.user import User
from app.models.record import Record
from app.utils.random_id import RandomIDGenerator
from app.database import db
import time

def test_random_id_generation():
    """测试随机ID生成"""
    print("=== 测试随机ID生成 ===")
    
    # 测试用户ID生成
    user_id1 = RandomIDGenerator.generate_user_id()
    user_id2 = RandomIDGenerator.generate_user_id()
    print(f"用户ID 1: {user_id1}")
    print(f"用户ID 2: {user_id2}")
    print(f"ID不重复: {user_id1 != user_id2}")
    print(f"ID格式有效: {RandomIDGenerator.is_valid_id_format(user_id1)}")
    
    # 测试记录ID生成
    record_id1 = RandomIDGenerator.generate_record_id()
    record_id2 = RandomIDGenerator.generate_record_id()
    print(f"记录ID 1: {record_id1}")
    print(f"记录ID 2: {record_id2}")
    print(f"ID不重复: {record_id1 != record_id2}")
    print(f"ID格式有效: {RandomIDGenerator.is_valid_id_format(record_id1)}")
    
    # 测试迁移安全ID
    migration_id = RandomIDGenerator.generate_migration_safe_id()
    print(f"迁移安全ID: {migration_id}")
    print()

def test_user_model():
    """测试用户模型的随机ID功能"""
    print("=== 测试用户模型 ===")
    
    app = create_app()
    with app.app_context():
        try:
            # 创建测试用户
            test_user = User.create_user(
                username=f'testuser_{int(time.time())}',
                email=f'test_{int(time.time())}@example.com',
                password='testpassword123'
            )
            
            print(f"创建用户成功: ID={test_user.id}, 用户名={test_user.username}")
            print(f"ID是随机生成: {test_user.id > 1000000}")  # 随机ID应该很大
            
            # 验证用户可以正常查找
            found_user = User.find_by_id(test_user.id)
            print(f"通过ID查找用户成功: {found_user is not None}")
            
            # 验证用户功能
            print(f"密码验证成功: {test_user.check_password('testpassword123')}")
            print(f"生成的Token有效: {len(test_user.generate_access_token()) > 0}")
            
        except Exception as e:
            print(f"用户模型测试失败: {e}")
    print()

def test_record_model():
    """测试记录模型的随机ID功能"""
    print("=== 测试记录模型 ===")
    
    app = create_app()
    with app.app_context():
        try:
            # 创建测试记录
            test_record = Record(
                content='测试任务',
                category='task',
                task_type='work'
            )
            db.session.add(test_record)
            db.session.commit()
            
            print(f"创建记录成功: ID={test_record.id}, 内容={test_record.content}")
            print(f"ID是随机生成: {test_record.id > 1000000}")  # 随机ID应该很大
            
            # 测试子任务创建
            subtask = test_record.add_subtask('子任务测试', 'task', 'work')
            db.session.commit()
            
            print(f"创建子任务成功: ID={subtask.id}, 父任务ID={subtask.parent_id}")
            print(f"子任务关系正确: {subtask.parent_id == test_record.id}")
            
            # 测试记录查询
            found_record = Record.query.get(test_record.id)
            print(f"通过ID查找记录成功: {found_record is not None}")
            
            # 测试父子关系
            subtasks = found_record.get_subtasks()
            print(f"父任务有子任务: {len(subtasks) > 0}")
            
        except Exception as e:
            print(f"记录模型测试失败: {e}")
    print()

def test_parent_child_relationships():
    """测试父子任务关系的随机ID兼容性"""
    print("=== 测试父子任务关系 ===")
    
    app = create_app()
    with app.app_context():
        try:
            # 创建用户
            user = User.create_user(
                username=f'taskuser_{int(time.time())}',
                email=f'taskuser_{int(time.time())}@example.com',
                password='password123'
            )
            
            # 创建父任务
            parent_task = Record(
                content='父任务测试',
                category='task',
                task_type='work',
                user_id=user.id
            )
            db.session.add(parent_task)
            db.session.flush()  # 获取ID但不提交
            
            # 创建多个子任务
            subtask_ids = []
            for i in range(3):
                subtask = Record(
                    content=f'子任务 {i+1}',
                    category='task',
                    parent_id=parent_task.id,
                    user_id=user.id
                )
                db.session.add(subtask)
                db.session.flush()
                subtask_ids.append(subtask.id)
            
            db.session.commit()
            
            # 验证关系
            parent = Record.query.get(parent_task.id)
            children = parent.get_subtasks()
            
            print(f"父任务ID: {parent.id}")
            print(f"子任务数量: {len(children)}")
            print(f"子任务IDs: {[c.id for c in children]}")
            print(f"所有子任务都指向正确的父任务: {all(c.parent_id == parent.id for c in children)}")
            
            # 测试导出格式兼容性
            parent_dict = parent.to_dict(include_subtasks=True)
            print(f"导出格式包含子任务: {'subtasks' in parent_dict}")
            print(f"导出的子任务数量: {len(parent_dict.get('subtasks', []))}")
            
        except Exception as e:
            print(f"父子关系测试失败: {e}")
    print()

def main():
    """运行所有测试"""
    print("开始测试随机ID系统...")
    print("=" * 50)
    
    test_random_id_generation()
    test_user_model()
    test_record_model()
    test_parent_child_relationships()
    
    print("=" * 50)
    print("所有测试完成！")

if __name__ == "__main__":
    main()