#!/usr/bin/env python3
"""
信息资源模块测试脚本
测试API的CRUD功能
"""

import requests
import json
import time

BASE_URL = "http://localhost:5050"

def test_info_resources_api():
    """测试信息资源API"""
    print("🧪 开始测试信息资源API...")
    
    # 测试创建信息资源
    print("\n1. 测试创建信息资源...")
    create_data = {
        "title": "测试信息资源",
        "content": "这是一个测试信息资源的详细内容，用于验证API功能。",
        "resource_type": "article"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/info-resources", json=create_data)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 201:
            data = response.json()
            resource_id = data['info_resource']['id']
            print(f"✅ 创建成功，ID: {resource_id}")
            print(f"标题: {data['info_resource']['title']}")
            print(f"类型: {data['info_resource']['resource_type']}")
        else:
            print(f"❌ 创建失败: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ 请求异常: {e}")
        return False
    
    # 测试获取信息资源列表
    print("\n2. 测试获取信息资源列表...")
    try:
        response = requests.get(f"{BASE_URL}/api/info-resources")
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 获取成功，共 {data['total']} 条记录")
            print(f"当前页: {data['page']}/{data['pages']}")
            for resource in data['info_resources']:
                print(f"  - {resource['title']} ({resource['resource_type']})")
        else:
            print(f"❌ 获取失败: {response.text}")
            
    except Exception as e:
        print(f"❌ 请求异常: {e}")
    
    # 测试获取单个信息资源
    print(f"\n3. 测试获取单个信息资源 (ID: {resource_id})...")
    try:
        response = requests.get(f"{BASE_URL}/api/info-resources/{resource_id}")
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            resource = data['info_resource']
            print(f"✅ 获取成功")
            print(f"标题: {resource['title']}")
            print(f"内容: {resource['content'][:50]}...")
            print(f"类型: {resource['resource_type']}")
            print(f"状态: {resource['status']}")
        else:
            print(f"❌ 获取失败: {response.text}")
            
    except Exception as e:
        print(f"❌ 请求异常: {e}")
    
    # 测试更新信息资源
    print(f"\n4. 测试更新信息资源 (ID: {resource_id})...")
    update_data = {
        "title": "更新后的测试信息资源",
        "content": "这是更新后的详细内容，用于验证更新功能。",
        "resource_type": "note"
    }
    
    try:
        response = requests.put(f"{BASE_URL}/api/info-resources/{resource_id}", json=update_data)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            resource = data['info_resource']
            print(f"✅ 更新成功")
            print(f"新标题: {resource['title']}")
            print(f"新类型: {resource['resource_type']}")
        else:
            print(f"❌ 更新失败: {response.text}")
            
    except Exception as e:
        print(f"❌ 请求异常: {e}")
    
    # 测试搜索功能
    print("\n5. 测试搜索功能...")
    try:
        response = requests.get(f"{BASE_URL}/api/info-resources?search=测试")
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 搜索成功，找到 {data['total']} 条记录")
            for resource in data['info_resources']:
                print(f"  - {resource['title']}")
        else:
            print(f"❌ 搜索失败: {response.text}")
            
    except Exception as e:
        print(f"❌ 请求异常: {e}")
    
    # 测试类型筛选
    print("\n6. 测试类型筛选...")
    try:
        response = requests.get(f"{BASE_URL}/api/info-resources?resource_type=note")
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 筛选成功，找到 {data['total']} 条记录")
            for resource in data['info_resources']:
                print(f"  - {resource['title']} ({resource['resource_type']})")
        else:
            print(f"❌ 筛选失败: {response.text}")
            
    except Exception as e:
        print(f"❌ 请求异常: {e}")
    
    # 测试归档功能
    print(f"\n7. 测试归档功能 (ID: {resource_id})...")
    try:
        response = requests.post(f"{BASE_URL}/api/info-resources/{resource_id}/archive")
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            resource = data['info_resource']
            print(f"✅ 归档成功")
            print(f"状态: {resource['status']}")
        else:
            print(f"❌ 归档失败: {response.text}")
            
    except Exception as e:
        print(f"❌ 请求异常: {e}")
    
    # 测试恢复功能
    print(f"\n8. 测试恢复功能 (ID: {resource_id})...")
    try:
        response = requests.post(f"{BASE_URL}/api/info-resources/{resource_id}/restore")
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            resource = data['info_resource']
            print(f"✅ 恢复成功")
            print(f"状态: {resource['status']}")
        else:
            print(f"❌ 恢复失败: {response.text}")
            
    except Exception as e:
        print(f"❌ 请求异常: {e}")
    
    # 测试删除功能
    print(f"\n9. 测试删除功能 (ID: {resource_id})...")
    try:
        response = requests.delete(f"{BASE_URL}/api/info-resources/{resource_id}")
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            print(f"✅ 删除成功")
        else:
            print(f"❌ 删除失败: {response.text}")
            
    except Exception as e:
        print(f"❌ 请求异常: {e}")
    
    print("\n🎉 信息资源API测试完成！")

if __name__ == '__main__':
    # 等待服务器启动
    print("⏳ 等待服务器启动...")
    time.sleep(3)
    
    # 测试API
    test_info_resources_api()
