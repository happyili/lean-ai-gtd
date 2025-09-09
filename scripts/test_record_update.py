#!/usr/bin/env python3
"""
测试记录更新功能
"""

import requests
import json

BASE_URL = "http://localhost:5050"

def test_update_record():
    """测试记录更新"""
    print("=== 测试记录更新功能 ===")
    
    # 1. 先登录获取token
    login_data = {
        "username": "testuser",
        "password": "TestPass123!"
    }
    
    response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
    if response.status_code != 200:
        print(f"登录失败: {response.status_code}, {response.json()}")
        return False
    
    token = response.json().get('access_token')
    headers = {"Authorization": f"Bearer {token}"}
    print("登录成功")
    
    # 2. 创建一个测试记录
    record_data = {
        "content": "测试更新记录",
        "category": "task",
        "priority": "medium"
    }
    
    response = requests.post(f"{BASE_URL}/api/records", headers=headers, json=record_data)
    if response.status_code != 201:
        print(f"创建记录失败: {response.status_code}, {response.json()}")
        return False
    
    record = response.json()['record']
    record_id = record['id']
    print(f"创建记录成功，ID: {record_id}")
    
    # 3. 更新记录
    update_data = {
        "content": "更新后的记录内容",
        "status": "active",
        "priority": "high",
        "progress": 50
    }
    
    response = requests.put(f"{BASE_URL}/api/records/{record_id}", headers=headers, json=update_data)
    if response.status_code == 200:
        updated_record = response.json()['record']
        print(f"更新记录成功: {updated_record['content']}, 优先级: {updated_record['priority']}, 进度: {updated_record['progress']}%")
        return True
    else:
        print(f"更新记录失败: {response.status_code}, {response.json()}")
        return False

def test_invalid_token_update():
    """测试无效token更新"""
    print("\n=== 测试无效token更新 ===")
    
    headers = {"Authorization": "Bearer invalid_token"}
    update_data = {"content": "尝试用无效token更新"}
    
    response = requests.put(f"{BASE_URL}/api/records/1", headers=headers, json=update_data)
    if response.status_code == 401:
        print(f"无效token正确返回401: {response.json()}")
        return True
    else:
        print(f"无效token应该返回401，实际返回: {response.status_code}")
        return False

if __name__ == "__main__":
    try:
        success1 = test_update_record()
        success2 = test_invalid_token_update()
        
        if success1 and success2:
            print("\n✅ 所有测试通过！")
        else:
            print("\n❌ 部分测试失败")
            
    except requests.exceptions.ConnectionError:
        print("错误: 无法连接到后端服务")
    except Exception as e:
        print(f"测试过程中发生错误: {e}")