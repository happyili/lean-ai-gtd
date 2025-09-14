#!/usr/bin/env python3
"""
番茄任务流程测试脚本（无需AI服务）
验证数据库操作、API逻辑和UI数据流
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime

# 添加项目根目录到Python路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app import create_app
from app.database import db
from app.models.user import User
from app.models.record import Record
from app.models.pomodoro_task import PomodoroTask

def create_test_user():
    """创建测试用户"""
    print("📋 创建测试用户...")
    
    test_user = User.query.filter_by(username='test_pomodoro').first()
    if not test_user:
        test_user = User(
            username='test_pomodoro',
            email='test@pomodoro.com',
            password_hash='dummy_hash'
        )
        db.session.add(test_user)
        db.session.commit()
    
    print(f"✅ 测试用户ID: {test_user.id}")
    return test_user

def create_mock_pomodoro_tasks(user_id):
    """创建模拟番茄任务（不使用AI）"""
    print("📋 创建模拟番茄任务...")
    
    # 清除现有任务
    PomodoroTask.clear_user_tasks(user_id)
    
    mock_tasks = [
        {
            'title': '完成前端组件重构',
            'description': '重构React组件，提升性能和可维护性',
            'priority_score': 85,
            'estimated_pomodoros': 3,
            'order_index': 1,
            'ai_reasoning': '高优先级开发任务，需要专注完成'
        },
        {
            'title': '编写API文档',
            'description': '为REST API编写详细的使用文档',
            'priority_score': 70,
            'estimated_pomodoros': 2,
            'order_index': 2,
            'ai_reasoning': '中等优先级文档任务，有助于团队协作'
        },
        {
            'title': '修复数据库性能问题',
            'description': '优化慢查询，提升数据库响应速度',
            'priority_score': 90,
            'estimated_pomodoros': 2,
            'order_index': 3,
            'ai_reasoning': '紧急性能问题，需要立即处理'
        }
    ]
    
    created_tasks = []
    for task_data in mock_tasks:
        task = PomodoroTask(
            user_id=user_id,
            **task_data
        )
        db.session.add(task)
        created_tasks.append(task)
    
    db.session.commit()
    print(f"✅ 创建了{len(created_tasks)}个模拟番茄任务")
    return created_tasks

def test_task_lifecycle(tasks, user_id):
    """测试任务完整生命周期"""
    print("\n🔄 测试任务生命周期...")
    
    task = tasks[0]  # 使用第一个任务
    print(f"测试任务: {task.title}")
    
    # 1. 初始状态验证
    print(f"1️⃣ 初始状态: {task.status}")
    assert task.status == 'pending', f"初始状态应为pending，实际为{task.status}"
    
    # 2. 启动任务
    print("2️⃣ 启动任务...")
    success = task.start_pomodoro()
    db.session.commit()
    
    assert success, "任务启动应该成功"
    assert task.status == 'active', f"启动后状态应为active，实际为{task.status}"
    assert task.started_at is not None, "started_at应该有值"
    print(f"   ✅ 任务已启动，开始时间: {task.started_at}")
    
    # 3. 完成一个番茄钟
    print("3️⃣ 完成番茄钟...")
    success = task.complete_pomodoro(25)  # 25分钟专注时间
    db.session.commit()
    
    assert success, "完成番茄钟应该成功"
    assert task.pomodoros_completed == 1, f"完成数应为1，实际为{task.pomodoros_completed}"
    assert task.total_focus_time == 25, f"专注时间应为25，实际为{task.total_focus_time}"
    print(f"   ✅ 完成1个番茄钟，总专注时间: {task.total_focus_time}分钟")
    
    # 4. 继续完成更多番茄钟直到任务完成
    remaining_pomodoros = task.estimated_pomodoros - task.pomodoros_completed
    print(f"4️⃣ 继续完成剩余{remaining_pomodoros}个番茄钟...")
    
    for i in range(remaining_pomodoros):
        task.complete_pomodoro(25)
        db.session.commit()
        print(f"   ✅ 完成第{task.pomodoros_completed}个番茄钟")
    
    # 验证任务是否自动完成
    assert task.status == 'completed', f"所有番茄钟完成后状态应为completed，实际为{task.status}"
    assert task.completed_at is not None, "completed_at应该有值"
    print(f"   ✅ 任务自动完成，完成时间: {task.completed_at}")
    
    return task

def test_skip_task(tasks, user_id):
    """测试跳过任务"""
    print("\n⏭️ 测试跳过任务...")
    
    task = tasks[1]  # 使用第二个任务
    print(f"跳过任务: {task.title}")
    
    success = task.skip_task()
    db.session.commit()
    
    assert success, "跳过任务应该成功"
    assert task.status == 'skipped', f"跳过后状态应为skipped，实际为{task.status}"
    print("✅ 任务跳过成功")
    
    return task

def test_statistics(user_id):
    """测试统计功能"""
    print("\n📊 测试统计功能...")
    
    # 获取所有任务
    tasks = PomodoroTask.query.filter_by(user_id=user_id).all()
    
    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t.status == 'completed'])
    active_tasks = len([t for t in tasks if t.status == 'active'])
    pending_tasks = len([t for t in tasks if t.status == 'pending'])
    skipped_tasks = len([t for t in tasks if t.status == 'skipped'])
    
    total_pomodoros = sum(t.pomodoros_completed for t in tasks)
    total_focus_time = sum(t.total_focus_time for t in tasks)
    
    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    print("✅ 统计结果:")
    print(f"   总任务数: {total_tasks}")
    print(f"   已完成: {completed_tasks}")
    print(f"   进行中: {active_tasks}")
    print(f"   待开始: {pending_tasks}")
    print(f"   已跳过: {skipped_tasks}")
    print(f"   总番茄钟: {total_pomodoros}")
    print(f"   总专注时间: {total_focus_time}分钟")
    print(f"   完成率: {completion_rate:.1f}%")
    
    # 验证统计逻辑
    assert total_tasks > 0, "应该有测试任务"
    assert completed_tasks > 0, "应该有完成的任务"
    assert skipped_tasks > 0, "应该有跳过的任务"
    assert total_pomodoros > 0, "应该有完成的番茄钟"
    assert total_focus_time > 0, "应该有专注时间"
    
    return {
        'total_tasks': total_tasks,
        'completed_tasks': completed_tasks,
        'total_pomodoros': total_pomodoros,
        'total_focus_time': total_focus_time,
        'completion_rate': completion_rate
    }

def test_api_data_format():
    """测试API数据格式"""
    print("\n🔗 测试API数据格式...")
    
    # 获取所有番茄任务
    tasks = PomodoroTask.query.limit(3).all()
    
    for task in tasks:
        task_dict = task.to_dict()
        
        # 验证必需字段
        required_fields = [
            'id', 'user_id', 'title', 'description', 
            'priority_score', 'estimated_pomodoros', 
            'status', 'pomodoros_completed', 'total_focus_time'
        ]
        
        for field in required_fields:
            assert field in task_dict, f"任务字典应包含字段: {field}"
        
        # 验证时间戳格式
        if task_dict['started_at']:
            assert task_dict['started_at'].endswith('Z'), "started_at应为ISO格式并以Z结尾"
        
        if task_dict['completed_at']:
            assert task_dict['completed_at'].endswith('Z'), "completed_at应为ISO格式并以Z结尾"
        
        print(f"   ✅ 任务 {task.id} 数据格式正确")
    
    print("✅ API数据格式验证通过")

def main():
    """主测试流程"""
    print("🧪 番茄任务完整流程测试")
    print("=" * 60)
    
    app = create_app()
    
    with app.app_context():
        try:
            # 创建测试数据
            test_user = create_test_user()
            tasks = create_mock_pomodoro_tasks(test_user.id)
            
            # 测试任务生命周期
            completed_task = test_task_lifecycle(tasks, test_user.id)
            skipped_task = test_skip_task(tasks, test_user.id)
            
            # 测试统计功能
            stats = test_statistics(test_user.id)
            
            # 测试API数据格式
            test_api_data_format()
            
            print("\n" + "=" * 60)
            print("🎉 所有测试通过！")
            print("✅ 数据库操作")
            print("✅ 任务状态管理")
            print("✅ 番茄钟计数")
            print("✅ 时间统计")
            print("✅ 完成率计算")
            print("✅ API数据格式")
            
            print(f"\n📊 测试结果摘要:")
            print(f"   完成任务: {completed_task.title}")
            print(f"   跳过任务: {skipped_task.title}")
            print(f"   总专注时间: {stats['total_focus_time']}分钟")
            print(f"   完成率: {stats['completion_rate']:.1f}%")
            
            return True
            
        except Exception as e:
            print(f"\n❌ 测试失败: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)