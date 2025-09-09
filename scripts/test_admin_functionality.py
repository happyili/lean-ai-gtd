#!/usr/bin/env python3
"""
测试管理员功能
"""

import requests
import json

BASE_URL = "http://localhost:5050"

def test_admin_login_and_access():
    """测试管理员登录和访问权限"""
    print("=== 测试管理员登录和访问 ===")
    
    # 1. 管理员登录
    admin_login = {
        "username": "admin",
        "password": "AdminPass123!"
    }
    
    response = requests.post(f"{BASE_URL}/api/auth/login", json=admin_login)
    if response.status_code != 200:
        print(f"管理员登录失败: {response.status_code}, {response.json()}")
        return None
    
    admin_token = response.json().get('access_token')
    print("管理员登录成功")
    return admin_token

def test_admin_can_see_all_records(admin_token):
    """测试管理员可以看到所有记录"""
    print("\n=== 测试管理员记录可见性 ===")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 获取所有记录
    response = requests.get(f"{BASE_URL}/api/records", headers=headers)
    if response.status_code != 200:
        print(f"管理员获取记录失败: {response.status_code}, {response.json()}")
        return False
    
    records = response.json()['records']
    print(f"管理员可以看到 {len(records)} 条记录:")
    
    # 统计不同用户的记录
    user_records = {}
    guest_records = 0
    
    for record in records:
        user_id = record.get('user_id')
        if user_id is None:
            guest_records += 1
        else:
            if user_id not in user_records:
                user_records[user_id] = 0
            user_records[user_id] += 1
    
    print(f"  - 游客记录: {guest_records} 条")
    for user_id, count in user_records.items():
        print(f"  - 用户 {user_id} 的记录: {count} 条")
    
    # 验证管理员确实可以看到不同用户的记录
    total_users = len(user_records) + (1 if guest_records > 0 else 0)
    if total_users > 1:
        print("✅ 管理员可以看到不同用户的记录")
        return True
    else:
        print("❌ 管理员应该能看到不同用户的记录")
        return False

def test_admin_can_modify_any_record(admin_token):
    """测试管理员可以修改任何记录"""
    print("\n=== 测试管理员可以修改任何记录 ===")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 先获取一个非管理员创建的记录
    response = requests.get(f"{BASE_URL}/api/records", headers=headers)
    records = response.json()['records']
    
    # 找一个不属于管理员的记录（user_id != 1，因为admin的ID是1）
    target_record = None
    for record in records:
        if record.get('user_id') != 1:  # admin的ID是1
            target_record = record
            break
    
    if not target_record:
        print("没有找到非管理员的记录来测试")
        return False
    
    record_id = target_record['id']
    original_content = target_record['content']
    
    # 尝试修改这个记录
    update_data = {
        "content": f"管理员修改了记录: {original_content}",
        "status": "active"
    }
    
    response = requests.put(f"{BASE_URL}/api/records/{record_id}", headers=headers, json=update_data)
    if response.status_code == 200:
        print(f"✅ 管理员成功修改了其他用户的记录 (ID: {record_id})")
        return True
    else:
        print(f"❌ 管理员无法修改其他用户的记录: {response.status_code}, {response.json()}")
        return False

def compare_user_vs_admin_access():
    """对比普通用户和管理员的访问权限"""
    print("\n=== 对比普通用户和管理员的访问权限 ===")
    
    # 普通用户登录
    user_login = {
        "username": "testuser",
        "password": "TestPass123!"
    }
    
    response = requests.post(f"{BASE_URL}/api/auth/login", json=user_login)
    if response.status_code != 200:
        print("普通用户登录失败")
        return
    
    user_token = response.json().get('access_token')
    user_headers = {"Authorization": f"Bearer {user_token}"}
    
    # 管理员登录
    admin_token = test_admin_login_and_access()
    if not admin_token:
        return
    
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 获取普通用户可见的记录
    user_response = requests.get(f"{BASE_URL}/api/records", headers=user_headers)
    user_records_count = len(user_response.json()['records'])
    
    # 获取管理员可见的记录
    admin_response = requests.get(f"{BASE_URL}/api/records", headers=admin_headers)
    admin_records_count = len(admin_response.json()['records'])
    
    print(f"普通用户可见记录数: {user_records_count}")
    print(f"管理员可见记录数: {admin_records_count}")
    
    if admin_records_count > user_records_count:
        print("✅ 管理员比普通用户能看到更多记录")
    else:
        print("❌ 管理员应该比普通用户能看到更多记录")

if __name__ == "__main__":
    try:
        admin_token = test_admin_login_and_access()
        if admin_token:
            test1 = test_admin_can_see_all_records(admin_token)
            test2 = test_admin_can_modify_any_record(admin_token)
            compare_user_vs_admin_access()
            
            if test1 and test2:
                print("\n✅ 管理员功能测试通过！")
            else:
                print("\n❌ 管理员功能测试失败")
        else:
            print("无法测试管理员功能，登录失败")
            
    except requests.exceptions.ConnectionError:
        print("错误: 无法连接到后端服务")
    except Exception as e:
        print(f"测试过程中发生错误: {e}")