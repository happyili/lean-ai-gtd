#!/usr/bin/env python3
"""
测试重构后的请求日志记录
"""

import requests
import time

BASE_URL = 'http://localhost:5050'

def test_unified_logging():
    """测试统一的请求日志记录"""
    print("🧪 测试重构后的统一请求日志记录...")
    
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
    print("   - 应该看到 '========= before_request' 消息")
    print("   - 应该看到 '=========@app.before_request' 消息")
    print("   - API请求应该看到 '========= API请求' 消息")
    print("   - 应该看到请求头和请求体的日志记录")

if __name__ == '__main__':
    test_unified_logging()
