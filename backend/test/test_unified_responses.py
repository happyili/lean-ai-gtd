#!/usr/bin/env python3
"""
测试统一响应处理功能
验证错误码、错误响应和日志记录是否正常工作
"""

import requests
import json
import sys

BASE_URL = "http://localhost:5050"

def test_error_responses():
    """测试各种错误响应"""
    print("🧪 测试统一错误响应处理...")
    
    # 测试1: 缺少必需字段
    print("\n1. 测试缺少必需字段错误:")
    response = requests.post(f"{BASE_URL}/api/records", json={})
    print(f"   状态码: {response.status_code}")
    print(f"   响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    
    # 测试2: 字段值无效
    print("\n2. 测试字段值无效错误:")
    response = requests.post(f"{BASE_URL}/api/records", json={
        "content": "x" * 6000  # 超过5000字符限制
    })
    print(f"   状态码: {response.status_code}")
    print(f"   响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    
    # 测试3: 无效的认证token
    print("\n3. 测试认证错误:")
    response = requests.get(f"{BASE_URL}/api/records", headers={
        "Authorization": "Bearer invalid_token"
    })
    print(f"   状态码: {response.status_code}")
    print(f"   响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    
    # 测试4: 信息资源缺少标题
    print("\n4. 测试信息资源缺少标题:")
    response = requests.post(f"{BASE_URL}/api/info-resources", json={
        "content": "测试内容"
    })
    print(f"   状态码: {response.status_code}")
    print(f"   响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

def test_success_responses():
    """测试成功响应"""
    print("\n🧪 测试统一成功响应处理...")
    
    # 测试创建记录
    print("\n1. 测试创建记录成功:")
    response = requests.post(f"{BASE_URL}/api/records", json={
        "content": "测试记录内容",
        "category": "task"
    })
    print(f"   状态码: {response.status_code}")
    print(f"   响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    
    # 测试创建信息资源
    print("\n2. 测试创建信息资源成功:")
    response = requests.post(f"{BASE_URL}/api/info-resources", json={
        "title": "测试信息资源",
        "content": "测试信息资源内容",
        "resource_type": "note"
    })
    print(f"   状态码: {response.status_code}")
    print(f"   响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

def test_merged_logging():
    """测试合并后的日志记录"""
    print("\n🧪 测试合并后的日志记录...")
    
    # 设置环境变量测试日志配置
    import os
    print(f"   DEBUG_LOGGING: {os.getenv('DEBUG_LOGGING', 'true')}")
    print(f"   VERBOSE_LOGGING: {os.getenv('VERBOSE_LOGGING', 'false')}")
    
    # 发送请求触发自动日志记录
    print("\n   发送成功请求触发自动日志记录...")
    response = requests.post(f"{BASE_URL}/api/records", json={
        "content": "合并日志测试记录"
    })
    print(f"   请求完成，状态码: {response.status_code}")
    
    print("\n   发送错误请求触发自动日志记录...")
    response = requests.post(f"{BASE_URL}/api/records", json={
        "content": "x" * 6000  # 触发错误
    })
    print(f"   请求完成，状态码: {response.status_code}")
    
    print("\n   ✅ 检查后端控制台，应该看到自动记录的日志信息")

def main():
    """主测试函数"""
    print("🚀 开始测试统一响应处理功能")
    print("=" * 50)
    
    try:
        # 检查服务器是否运行
        response = requests.get(f"{BASE_URL}/api/records", timeout=5)
        print("✅ 后端服务器运行正常")
    except requests.exceptions.RequestException as e:
        print(f"❌ 无法连接到后端服务器: {e}")
        print("请确保后端服务器在 http://localhost:5050 运行")
        sys.exit(1)
    
    # 运行测试
    test_error_responses()
    test_success_responses()
    test_merged_logging()
    
    print("\n" + "=" * 50)
    print("🎉 测试完成！")
    print("\n📋 检查要点:")
    print("1. 所有错误响应都包含 error_code 字段")
    print("2. 错误响应格式统一: error, error_code, details, timestamp")
    print("3. 成功响应格式统一: success, data, message, timestamp")
    print("4. 后端控制台应该显示结构化的日志信息")

if __name__ == "__main__":
    main()
