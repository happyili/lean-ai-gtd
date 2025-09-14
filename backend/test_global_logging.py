#!/usr/bin/env python3
"""
测试全局请求日志记录功能
"""

import requests
import time

BASE_URL = 'http://localhost:5050'

def test_global_logging():
    """测试全局日志记录"""
    print("🧪 测试全局请求日志记录...")
    
    # 测试多个不同的API端点
    endpoints = [
        ('GET', '/api/records'),
        ('POST', '/api/info-resources'),
        ('GET', '/api/info-resources'),
        ('GET', '/api/reminders'),
        ('GET', '/api/auth/health')
    ]
    
    for method, endpoint in endpoints:
        print(f"\n   测试 {method} {endpoint}...")
        try:
            if method == 'GET':
                response = requests.get(f"{BASE_URL}{endpoint}")
            elif method == 'POST':
                if endpoint == '/api/info-resources':
                    response = requests.post(f"{BASE_URL}{endpoint}", json={
                        "title": "测试标题",
                        "content": "测试内容"
                    })
                else:
                    response = requests.post(f"{BASE_URL}{endpoint}", json={})
            
            print(f"   状态码: {response.status_code}")
            print(f"   响应: {response.json()}")
            
        except requests.exceptions.RequestException as e:
            print(f"   ❌ 请求失败: {e}")
        
        time.sleep(0.5)  # 给日志一些时间输出
    
    print("\n   ✅ 检查后端控制台，应该看到每个请求的 '🔍 开始处理请求' 日志")

if __name__ == '__main__':
    test_global_logging()
