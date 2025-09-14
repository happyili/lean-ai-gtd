#!/usr/bin/env python3
"""
完整的番茄任务流程测试脚本
验证生成、保存、读取、启动、完成的整个生命周期
"""

import os
import sys
import json
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app import create_app
from app.database import db
from app.models.user import User
from app.models.record import Record
from app.models.pomodoro_task import PomodoroTask
from app.services.pomodoro_intelligence import PomodoroIntelligenceService

def create_test_user():
    """创建测试用户"""
    print("📋 创建测试用户...")
    
    # 查找或创建测试用户
    test_user = User.query.filter_by(username='test_pomodoro').first()
    if not test_user:
        test_user = User(
            username='test_pomodoro',
            email='test@pomodoro.com',
            password_hash='dummy_hash'  # 测试用户不需要真实密码
        )
        db.session.add(test_user)
        db.session.commit()
    
    print(f"✅ 测试用户ID: {test_user.id}")
    return test_user

def create_test_tasks(user_id):
    """创建测试任务数据"""
    print("📋 创建测试任务...")
    
    # 清除该用户的现有任务
    Record.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    
    test_tasks = [
        {
            'content': '完成项目前端组件开发',
            'priority': 'high',
            'task_type': 'development',
            'category': 'task',
            'status': 'active',
            'progress': 30
        },
        {
            'content': '编写API文档',
            'priority': 'medium',
            'task_type': 'documentation',
            'category': 'task',
            'status': 'active',
            'progress': 0
        },
        {
            'content': '修复数据库查询性能问题',
            'priority': 'urgent',
            'task_type': 'bugfix',
            'category': 'task',
            'status': 'active',
            'progress': 10
        }
    ]
    
    created_tasks = []
    for task_data in test_tasks:
        task = Record(
            user_id=user_id,
            **task_data
        )
        db.session.add(task)
        created_tasks.append(task)
    
    db.session.commit()
    print(f"✅ 创建了{len(created_tasks)}个测试任务")
    return created_tasks

def test_generate_pomodoro_tasks(user_id):
    """测试番茄任务生成"""
    print("\n🍅 测试番茄任务生成...")
    
    # 清除现有番茄任务
    PomodoroTask.clear_user_tasks(user_id)
    
    # 生成番茄任务
    result = PomodoroIntelligenceService.generate_pomodoro_tasks(user_id)
    
    print(f"生成结果: {result['success']}")
    if result['success']:
        print(f"✅ 成功生成{len(result['tasks'])}个番茄任务")
        for i, task in enumerate(result['tasks'], 1):
            print(f"  {i}. {task['title']} (优先级:{task['priority_score']}, 预估:{task['estimated_pomodoros']}🍅)")
    else:
        print(f"❌ 生成失败: {result['message']}")
    
    return result

def test_task_persistence(user_id):
    """测试任务持久化"""
    print("\n💾 测试任务持久化...")
    
    # 从数据库读取番茄任务
    tasks = PomodoroTask.get_user_current_tasks(user_id)
    print(f"✅ 从数据库读取到{len(tasks)}个番茄任务")
    
    for task in tasks:
        print(f"  ID:{task.id}, 标题:{task.title}, 状态:{task.status}")
    
    return tasks

def test_task_start(task_id, user_id):
    """测试任务启动"""
    print(f"\n▶️ 测试启动任务 ID:{task_id}...")
    
    result = PomodoroIntelligenceService.update_task_status(task_id, user_id, 'start')
    
    if result['success']:
        print(f"✅ 任务启动成功")
        print(f"  状态: {result['task']['status']}")
        print(f"  开始时间: {result['task']['started_at']}")
    else:
        print(f"❌ 启动失败: {result['message']}")
    
    return result

def test_task_complete(task_id, user_id):
    """测试任务完成"""
    print(f"\n✅ 测试完成任务 ID:{task_id}...")
    
    result = PomodoroIntelligenceService.update_task_status(task_id, user_id, 'complete')
    
    if result['success']:
        print(f"✅ 任务完成成功")
        print(f"  状态: {result['task']['status']}")
        print(f"  完成番茄钟数: {result['task']['pomodoros_completed']}")
        print(f"  总专注时间: {result['task']['total_focus_time']}分钟")
        print(f"  完成时间: {result['task']['completed_at']}")
    else:
        print(f"❌ 完成失败: {result['message']}")
    
    return result

def test_statistics(user_id):
    """测试统计信息"""
    print(f"\n📊 测试统计信息...")
    
    from app.models.pomodoro_task import PomodoroTask
    from sqlalchemy import func
    from datetime import datetime, date
    
    # 获取统计数据
    stats_query = PomodoroTask.query.filter_by(user_id=user_id)
    
    total_tasks = stats_query.count()
    completed_tasks = stats_query.filter_by(status='completed').count()
    active_tasks = stats_query.filter_by(status='active').count()
    pending_tasks = stats_query.filter_by(status='pending').count()
    
    # 计算总番茄钟数和专注时间
    totals = stats_query.with_entities(
        func.sum(PomodoroTask.pomodoros_completed).label('total_pomodoros'),
        func.sum(PomodoroTask.total_focus_time).label('total_focus_time')
    ).first()
    
    total_pomodoros = totals.total_pomodoros or 0
    total_focus_time = totals.total_focus_time or 0
    
    # 今日统计
    today = date.today()
    today_tasks = stats_query.filter(
        func.date(PomodoroTask.created_at) == today
    )
    
    today_completed = today_tasks.filter_by(status='completed').count()
    today_totals = today_tasks.with_entities(
        func.sum(PomodoroTask.pomodoros_completed).label('today_pomodoros'),
        func.sum(PomodoroTask.total_focus_time).label('today_focus_time')
    ).first()
    
    today_pomodoros = today_totals.today_pomodoros or 0
    today_focus_time = today_totals.today_focus_time or 0
    
    print("✅ 统计信息:")
    print(f"  总任务数: {total_tasks}")
    print(f"  已完成: {completed_tasks}")
    print(f"  进行中: {active_tasks}")
    print(f"  待开始: {pending_tasks}")
    print(f"  总番茄钟: {total_pomodoros}")
    print(f"  总专注时间: {total_focus_time}分钟")
    print(f"  今日完成: {today_completed}")
    print(f"  今日番茄钟: {today_pomodoros}")
    print(f"  今日专注时间: {today_focus_time}分钟")
    
    completion_rate = round(completed_tasks / total_tasks * 100, 1) if total_tasks > 0 else 0
    print(f"  完成率: {completion_rate}%")
    
    return {
        'total_stats': {
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'active_tasks': active_tasks,
            'pending_tasks': pending_tasks,
            'total_pomodoros': total_pomodoros,
            'total_focus_time': total_focus_time,
            'completion_rate': completion_rate
        },
        'today_stats': {
            'today_completed_tasks': today_completed,
            'today_pomodoros': today_pomodoros,
            'today_focus_time': today_focus_time,
            'today_focus_hours': round(today_focus_time / 60, 1)
        }
    }

def test_api_routes():
    """测试API路由"""
    print("\n🌐 测试API路由注册...")
    
    app = create_app()
    
    with app.app_context():
        # 检查路由是否注册
        pomodoro_routes = []
        for rule in app.url_map.iter_rules():
            if 'pomodoro' in rule.rule:
                pomodoro_routes.append({
                    'endpoint': rule.endpoint,
                    'methods': list(rule.methods),
                    'rule': rule.rule
                })
        
        print(f"✅ 发现{len(pomodoro_routes)}个番茄钟API路由:")
        for route in pomodoro_routes:
            print(f"  {route['rule']} - {route['methods']}")
    
    return pomodoro_routes

def main():
    """主测试流程"""
    print("🧪 开始番茄任务完整流程测试")
    print("=" * 60)
    
    app = create_app()
    
    with app.app_context():
        try:
            # 1. 测试API路由
            test_api_routes()
            
            # 2. 创建测试数据
            test_user = create_test_user()
            create_test_tasks(test_user.id)
            
            # 3. 测试生成番茄任务
            generate_result = test_generate_pomodoro_tasks(test_user.id)
            if not generate_result['success']:
                print("❌ 番茄任务生成失败，终止测试")
                return False
            
            # 4. 测试任务持久化
            tasks = test_task_persistence(test_user.id)
            if not tasks:
                print("❌ 没有找到持久化的任务")
                return False
            
            # 5. 测试任务启动
            first_task = tasks[0]
            start_result = test_task_start(first_task.id, test_user.id)
            if not start_result['success']:
                print("❌ 任务启动失败")
                return False
            
            # 6. 测试任务完成
            complete_result = test_task_complete(first_task.id, test_user.id)
            if not complete_result['success']:
                print("❌ 任务完成失败")
                return False
            
            # 7. 测试统计信息
            stats = test_statistics(test_user.id)
            
            print("\n" + "=" * 60)
            print("🎉 所有测试通过！番茄任务流程验证成功")
            print("✅ 生成 ✅ 保存 ✅ 读取 ✅ 启动 ✅ 完成 ✅ 统计")
            
            return True
            
        except Exception as e:
            print(f"\n❌ 测试过程中发生异常: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)