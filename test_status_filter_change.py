#!/usr/bin/env python3
"""
测试状态筛选功能的更改
验证 'pending' 状态筛选是否正确返回进行中和暂停中的任务
"""

import requests
import json
import sys
import os

# 添加backend目录到Python路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

def test_status_filter():
    """测试状态筛选功能"""
    base_url = "http://localhost:5050"
    
    print("=== 测试状态筛选功能更改 ===\n")
    
    # 1. 测试获取所有任务
    print("1. 获取所有任务:")
    try:
        response = requests.get(f"{base_url}/api/records?category=task")
        if response.status_code == 200:
            data = response.json()
            all_tasks = data.get('records', [])
            print(f"   总任务数: {len(all_tasks)}")
            
            # 统计各状态的任务数量
            status_counts = {}
            for task in all_tasks:
                status = task.get('status', 'unknown')
                status_counts[status] = status_counts.get(status, 0) + 1
            
            print("   各状态任务统计:")
            for status, count in status_counts.items():
                print(f"     {status}: {count}")
        else:
            print(f"   错误: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"   请求失败: {e}")
    
    # 2. 测试 pending 状态筛选
    print("\n2. 测试 'pending' 状态筛选:")
    try:
        response = requests.get(f"{base_url}/api/records?category=task&status=pending")
        if response.status_code == 200:
            data = response.json()
            pending_tasks = data.get('records', [])
            print(f"   待办任务数: {len(pending_tasks)}")
            
            # 验证返回的任务状态
            valid_statuses = ['active', 'paused']  # pending应该返回这些状态
            invalid_statuses = []
            
            for task in pending_tasks:
                status = task.get('status')
                if status not in valid_statuses:
                    invalid_statuses.append(status)
                    
            if invalid_statuses:
                print(f"   ❌ 发现不应该包含的状态: {set(invalid_statuses)}")
            else:
                print("   ✅ 所有返回的任务状态都正确 (active 或 paused)")
                
            # 显示前几个任务的详细信息
            if pending_tasks:
                print("   前3个待办任务:")
                for i, task in enumerate(pending_tasks[:3]):
                    print(f"     {i+1}. [{task.get('status')}] {task.get('content', '')[:50]}")
        else:
            print(f"   错误: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"   请求失败: {e}")
    
    # 3. 测试其他状态筛选（确保没有破坏）
    print("\n3. 测试其他状态筛选:")
    test_statuses = ['active', 'completed', 'paused', 'cancelled']
    
    for status in test_statuses:
        try:
            response = requests.get(f"{base_url}/api/records?category=task&status={status}")
            if response.status_code == 200:
                data = response.json()
                tasks = data.get('records', [])
                print(f"   {status}: {len(tasks)} 个任务")
                
                # 验证返回的任务确实是指定状态
                wrong_status = [t for t in tasks if t.get('status') != status]
                if wrong_status:
                    print(f"     ❌ 发现错误状态的任务: {len(wrong_status)}")
                else:
                    print(f"     ✅ 状态正确")
            else:
                print(f"   {status}: 错误 {response.status_code}")
        except Exception as e:
            print(f"   {status}: 请求失败 - {e}")
    
    print("\n=== 测试完成 ===")

if __name__ == "__main__":
    test_status_filter()
