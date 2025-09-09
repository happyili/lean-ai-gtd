#!/usr/bin/env python3
import sys
import os
import requests
import json
sys.path.append('backend')

def test_record_creation_with_auth():
    """测试带认证的记录创建"""
    base_url = 'http://localhost:5050'
    
    # 1. 先登录获取token
    print("1. 登录获取token...")
    login_data = {
        'username': 'testlogin',
        'password': 'TestLogin123!'
    }
    
    login_response = requests.post(f'{base_url}/api/auth/login', json=login_data)
    print(f"登录状态码: {login_response.status_code}")
    
    if login_response.status_code != 200:
        print("登录失败")
        return
    
    login_result = login_response.json()
    access_token = login_result['access_token']
    user_info = login_result['user']
    print(f"用户ID: {user_info['id']}")
    print(f"用户名: {user_info['username']}")
    
    # 2. 创建记录
    print("\n2. 创建记录...")
    record_data = {
        'content': '测试任务：验证用户ID关联',
        'category': 'task',
        'task_type': 'work',
        'priority': 'medium'
    }
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    create_response = requests.post(f'{base_url}/api/records', json=record_data, headers=headers)
    print(f"创建记录状态码: {create_response.status_code}")
    print(f"创建记录响应: {create_response.json()}")
    
    if create_response.status_code == 201:
        record = create_response.json()['record']
        print(f"✅ 记录创建成功!")
        print(f"记录ID: {record['id']}")
        print(f"记录内容: {record['content']}")
        print(f"用户ID: {record.get('user_id', 'None')}")
        
        # 3. 验证记录是否属于当前用户
        if record.get('user_id') == user_info['id']:
            print("✅ 用户ID关联正确!")
        else:
            print(f"❌ 用户ID关联错误! 期望: {user_info['id']}, 实际: {record.get('user_id')}")
    else:
        print("❌ 记录创建失败")

def test_record_creation_without_auth():
    """测试不带认证的记录创建（匿名用户）"""
    base_url = 'http://localhost:5050'
    
    print("\n3. 测试匿名用户创建记录...")
    record_data = {
        'content': '匿名用户测试任务',
        'category': 'task',
        'task_type': 'work',
        'priority': 'low'
    }
    
    create_response = requests.post(f'{base_url}/api/records', json=record_data)
    print(f"匿名用户创建记录状态码: {create_response.status_code}")
    print(f"匿名用户创建记录响应: {create_response.json()}")
    
    if create_response.status_code == 201:
        record = create_response.json()['record']
        print(f"✅ 匿名用户记录创建成功!")
        print(f"记录ID: {record['id']}")
        print(f"用户ID: {record.get('user_id', 'None')}")
        
        if record.get('user_id') is None:
            print("✅ 匿名用户ID关联正确!")
        else:
            print(f"❌ 匿名用户ID关联错误! 期望: None, 实际: {record.get('user_id')}")

if __name__ == '__main__':
    test_record_creation_with_auth()
    test_record_creation_without_auth()
