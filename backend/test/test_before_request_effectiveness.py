#!/usr/bin/env python3
"""
验证@app.before_request是否真的生效
"""

import requests
import time
import subprocess
import sys

BASE_URL = 'http://localhost:5050'

def test_before_request_effectiveness():
    """测试before_request是否真的生效"""
    print("🧪 测试@app.before_request是否真的生效...")
    
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
    
    print("\n   📋 检查Flask应用控制台:")
    print("   - 应该看到 '🚨 BEFORE_REQUEST TRIGGERED' 消息")
    print("   - API请求应该看到 '🚨 API REQUEST DETECTED' 消息")
    print("   - 如果没有看到这些消息，说明before_request没有生效")

def check_flask_process():
    """检查Flask进程状态"""
    print("\n🔍 检查Flask进程状态...")
    try:
        result = subprocess.run(['ps', 'aux'], capture_output=True, text=True)
        lines = result.stdout.split('\n')
        flask_processes = [line for line in lines if 'python' in line and 'app.py' in line]
        
        if flask_processes:
            print("   ✅ 找到Flask进程:")
            for process in flask_processes:
                print(f"   {process}")
        else:
            print("   ❌ 没有找到Flask进程")
            
    except Exception as e:
        print(f"   ❌ 检查进程失败: {e}")

if __name__ == '__main__':
    check_flask_process()
    test_before_request_effectiveness()
