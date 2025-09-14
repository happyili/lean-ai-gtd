#!/usr/bin/env python3
"""
验证Flask before_request钩子的调用行为
"""

import requests
import time

BASE_URL = 'http://localhost:5050'

def test_before_request_calls():
    """测试before_request钩子的调用"""
    print("🧪 测试Flask before_request钩子调用行为...")
    
    # 测试不同类型的请求
    requests_to_test = [
        ('GET', '/api/records', 'API请求'),
        ('GET', '/health', '非API请求'),
        ('GET', '/', '根路径'),
        ('POST', '/api/info-resources', 'POST API请求'),
        ('OPTIONS', '/api/records', 'OPTIONS预检请求')
    ]
    
    for method, path, description in requests_to_test:
        print(f"\n   测试 {description}: {method} {path}")
        try:
            if method == 'GET':
                response = requests.get(f"{BASE_URL}{path}")
            elif method == 'POST':
                response = requests.post(f"{BASE_URL}{path}", json={"title": "测试"})
            elif method == 'OPTIONS':
                response = requests.options(f"{BASE_URL}{path}")
            
            print(f"   状态码: {response.status_code}")
            print(f"   响应大小: {len(response.content)} bytes")
            
        except requests.exceptions.RequestException as e:
            print(f"   ❌ 请求失败: {e}")
        
        time.sleep(0.3)  # 给日志输出一些时间
    
    print("\n   📋 观察后端控制台输出:")
    print("   - 每个请求都应该触发before_request函数")
    print("   - 只有/api/开头的请求会记录详细日志")
    print("   - print语句会显示payload_length的值")

if __name__ == '__main__':
    test_before_request_calls()
