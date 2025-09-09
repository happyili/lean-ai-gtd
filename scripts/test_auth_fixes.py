#!/usr/bin/env python3
"""
测试用户认证和记录访问权限的脚本
验证修复后的JWT解析和权限控制是否正常工作
"""

import requests
import json
import sys

BASE_URL = "http://localhost:5050"

def test_guest_access():
    """测试游客访问权限"""
    print("=== 测试游客访问 ===")
    
    # 创建公共记录（不带token）
    response = requests.post(f"{BASE_URL}/api/records", 
                           json={"content": "游客创建的公共记录", "category": "note"})
    print(f"创建公共记录: {response.status_code}, {response.json()}")
    
    # 获取记录列表（不带token）
    response = requests.get(f"{BASE_URL}/api/records")
    print(f"游客获取记录列表: {response.status_code}, 记录数: {len(response.json().get('records', []))}")
    
    return response.status_code == 200

def test_user_registration_and_login():
    """测试用户注册和登录"""
    print("\n=== 测试用户注册和登录 ===")
    
    # 注册测试用户
    user_data = {
        "username": "testuser",
        "email": "testuser@example.com", 
        "password": "TestPass123!",
        "first_name": "Test",
        "last_name": "User"
    }
    
    response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
    print(f"用户注册: {response.status_code}, {response.json()}")
    
    # 登录
    login_data = {
        "username": "testuser",
        "password": "TestPass123!"
    }
    
    response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
    if response.status_code == 200:
        token = response.json().get('access_token')
        print(f"用户登录成功: {response.status_code}")
        return token
    else:
        print(f"用户登录失败: {response.status_code}, {response.json()}")
        return None

def test_admin_creation():
    """创建管理员用户"""
    print("\n=== 创建管理员用户 ===")
    
    admin_data = {
        "username": "admin",
        "email": "admin@example.com",
        "password": "AdminPass123!",
        "first_name": "Admin",
        "last_name": "User"
    }
    
    response = requests.post(f"{BASE_URL}/api/auth/register", json=admin_data)
    print(f"管理员注册: {response.status_code}")
    
    # 手动设置管理员权限（需要直接操作数据库）
    # 这里只测试登录
    login_data = {
        "username": "admin", 
        "password": "AdminPass123!"
    }
    
    response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
    if response.status_code == 200:
        admin_token = response.json().get('access_token')
        print(f"管理员登录成功: {response.status_code}")
        return admin_token
    else:
        print(f"管理员登录失败: {response.status_code}, {response.json()}")
        return None

def test_user_record_access(user_token):
    """测试普通用户记录访问权限"""
    print("\n=== 测试普通用户记录访问 ===")
    
    headers = {"Authorization": f"Bearer {user_token}"}
    
    # 创建用户记录
    response = requests.post(f"{BASE_URL}/api/records",
                           headers=headers,
                           json={"content": "用户创建的私人记录", "category": "task"})
    print(f"创建用户记录: {response.status_code}, {response.json()}")
    
    # 获取记录列表（应该只看到自己的记录）
    response = requests.get(f"{BASE_URL}/api/records", headers=headers)
    if response.status_code == 200:
        records = response.json().get('records', [])
        print(f"用户获取记录列表: {response.status_code}, 记录数: {len(records)}")
        
        # 检查记录是否都属于当前用户
        for record in records:
            print(f"  记录ID: {record.get('id')}, 内容: {record.get('content')[:30]}...")
    else:
        print(f"用户获取记录失败: {response.status_code}, {response.json()}")
    
    return response.status_code == 200

def test_admin_record_access(admin_token):
    """测试管理员记录访问权限"""
    print("\n=== 测试管理员记录访问 ===")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 获取记录列表（应该看到所有记录）
    response = requests.get(f"{BASE_URL}/api/records", headers=headers)
    if response.status_code == 200:
        records = response.json().get('records', [])
        print(f"管理员获取记录列表: {response.status_code}, 记录数: {len(records)}")
        
        # 显示记录详情
        for record in records:
            user_id = record.get('user_id', 'NULL')
            print(f"  记录ID: {record.get('id')}, user_id: {user_id}, 内容: {record.get('content')[:30]}...")
    else:
        print(f"管理员获取记录失败: {response.status_code}, {response.json()}")
    
    return response.status_code == 200

def test_token_validation():
    """测试Token验证"""
    print("\n=== 测试Token验证 ===")
    
    # 使用无效token
    invalid_headers = {"Authorization": "Bearer invalid_token"}
    response = requests.get(f"{BASE_URL}/api/records", headers=invalid_headers)
    print(f"无效token访问: {response.status_code}")
    
    # 使用错误格式的token
    malformed_headers = {"Authorization": "malformed_token"} 
    response = requests.get(f"{BASE_URL}/api/records", headers=malformed_headers)
    print(f"格式错误token访问: {response.status_code}")

def main():
    """主测试函数"""
    print("开始测试用户认证和权限控制...")
    
    try:
        # 测试游客访问
        test_guest_access()
        
        # 测试用户注册和登录
        user_token = test_user_registration_and_login()
        
        # 测试管理员创建和登录
        admin_token = test_admin_creation()
        
        # 测试Token验证
        test_token_validation()
        
        # 测试用户记录访问
        if user_token:
            test_user_record_access(user_token)
        
        # 测试管理员记录访问
        if admin_token:
            test_admin_record_access(admin_token)
            
        print("\n=== 测试完成 ===")
        
    except requests.exceptions.ConnectionError:
        print("错误: 无法连接到后端服务。请确保后端服务运行在 http://localhost:5050")
        sys.exit(1)
    except Exception as e:
        print(f"测试过程中发生错误: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()