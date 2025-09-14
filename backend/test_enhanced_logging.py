#!/usr/bin/env python3
"""
测试增强的全局请求日志记录功能
"""

import requests
import time
import os

BASE_URL = 'http://localhost:5050'

def test_enhanced_logging():
    """测试增强的日志记录功能"""
    print("🧪 测试增强的全局请求日志记录...")
    
    # 设置环境变量测试不同的配置
    print("\n   测试环境变量配置:")
    print(f"   LOG_HEADER_LENGTH: {os.getenv('LOG_HEADER_LENGTH', '200')}")
    print(f"   LOG_REQUEST_PAYLOAD_LENGTH: {os.getenv('LOG_REQUEST_PAYLOAD_LENGTH', '500')}")
    
    # 测试1: GET请求（无请求体）
    print("\n   测试1: GET请求（无请求体）")
    try:
        response = requests.get(f"{BASE_URL}/api/records")
        print(f"   状态码: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"   ❌ 请求失败: {e}")
    
    time.sleep(0.5)
    
    # 测试2: POST请求（JSON请求体）
    print("\n   测试2: POST请求（JSON请求体）")
    try:
        response = requests.post(f"{BASE_URL}/api/info-resources", json={
            "title": "测试标题",
            "content": "这是一个测试内容，用来验证请求体日志记录功能是否正常工作。",
            "resource_type": "note"
        })
        print(f"   状态码: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"   ❌ 请求失败: {e}")
    
    time.sleep(0.5)
    
    # 测试3: POST请求（大请求体）
    print("\n   测试3: POST请求（大请求体）")
    try:
        large_content = "这是一个很长的测试内容。" * 50  # 创建大内容
        response = requests.post(f"{BASE_URL}/api/info-resources", json={
            "title": "大内容测试",
            "content": large_content,
            "resource_type": "article"
        })
        print(f"   状态码: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"   ❌ 请求失败: {e}")
    
    time.sleep(0.5)
    
    # 测试4: POST请求（表单数据）
    print("\n   测试4: POST请求（表单数据）")
    try:
        response = requests.post(f"{BASE_URL}/api/records", data={
            "content": "表单数据测试",
            "category": "task"
        })
        print(f"   状态码: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"   ❌ 请求失败: {e}")
    
    print("\n   ✅ 检查后端控制台，应该看到详细的请求日志信息")
    print("   - 请求头信息（如果LOG_HEADER_LENGTH > 0）")
    print("   - 请求体信息（如果LOG_REQUEST_PAYLOAD_LENGTH > 0）")

def test_env_variables():
    """测试不同环境变量配置"""
    print("\n🧪 测试环境变量配置...")
    
    # 测试禁用请求头日志
    print("\n   测试禁用请求头日志 (LOG_HEADER_LENGTH=0)")
    os.environ['LOG_HEADER_LENGTH'] = '0'
    os.environ['LOG_REQUEST_PAYLOAD_LENGTH'] = '100'
    
    try:
        response = requests.get(f"{BASE_URL}/api/auth/health")
        print(f"   状态码: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"   ❌ 请求失败: {e}")
    
    time.sleep(0.5)
    
    # 测试禁用请求体日志
    print("\n   测试禁用请求体日志 (LOG_REQUEST_PAYLOAD_LENGTH=0)")
    os.environ['LOG_HEADER_LENGTH'] = '100'
    os.environ['LOG_REQUEST_PAYLOAD_LENGTH'] = '0'
    
    try:
        response = requests.post(f"{BASE_URL}/api/info-resources", json={
            "title": "测试",
            "content": "测试内容"
        })
        print(f"   状态码: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"   ❌ 请求失败: {e}")
    
    # 恢复默认值
    os.environ['LOG_HEADER_LENGTH'] = '200'
    os.environ['LOG_REQUEST_PAYLOAD_LENGTH'] = '500'

if __name__ == '__main__':
    test_enhanced_logging()
    test_env_variables()
