#!/usr/bin/env python3
"""
测试Flask请求钩子和中间件的有效性
"""

import requests
import time

BASE_URL = 'http://localhost:5050'

def test_request_hooks():
    """测试请求钩子是否生效"""
    print("🧪 测试Flask请求钩子和中间件...")
    
    # 测试不同类型的请求
    test_cases = [
        ('GET', '/api/records', 'API请求'),
        ('GET', '/health', '非API请求'),
        ('GET', '/', '根路径'),
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
            
        except requests.exceptions.RequestException as e:
            print(f"   ❌ 请求失败: {e}")
        
        time.sleep(0.5)
    
    print("\n   📋 检查Flask应用控制台输出:")
    print("   - WSGI中间件: 应该看到 '🚨 WSGI MIDDLEWARE' 消息")
    print("   - Flask钩子: 应该看到 '🚨 BEFORE_REQUEST' 消息")
    print("   - API请求: 应该看到 '🚨 API REQUEST' 消息")

if __name__ == '__main__':
    test_request_hooks()
