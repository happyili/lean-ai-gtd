#!/usr/bin/env python3
"""
测试重构后的统一应用工厂
"""

import requests
import time

BASE_URL = 'http://localhost:5050'

def test_unified_app_factory():
    """测试统一的应用工厂"""
    print("🧪 测试重构后的统一应用工厂...")
    
    # 测试不同类型的请求
    test_cases = [
        ('GET', '/', '首页'),
        ('GET', '/health', '健康检查'),
        ('GET', '/debug/logs', '调试日志'),
        ('GET', '/api/records', 'API请求'),
        ('POST', '/api/info-resources', 'POST API请求')
    ]
    
    for method, path, description in test_cases:
        print(f"\n   测试 {description}: {method} {path}")
        try:
            if method == 'GET':
                response = requests.get(f"{BASE_URL}{path}")
            elif method == 'POST':
                response = requests.post(f"{BASE_URL}{path}", json={"title": "测试"})
            
            print(f"   状态码: {response.status_code}")
            if response.status_code == 200:
                try:
                    data = response.json()
                    print(f"   响应: {data.get('message', 'OK')}")
                except:
                    print(f"   响应: {response.text[:100]}...")
            
        except requests.exceptions.RequestException as e:
            print(f"   ❌ 请求失败: {e}")
        
        time.sleep(0.5)
    
    print("\n   📋 检查Flask应用控制台输出:")
    print("   - 应该看到统一的日志格式")
    print("   - 应该看到请求开始、成功、响应的日志")
    print("   - 应该看到统一的错误处理")

if __name__ == '__main__':
    test_unified_app_factory()
