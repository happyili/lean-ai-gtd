#!/usr/bin/env python3
import sys
import os
sys.path.append('backend')

def test_record_creation_fresh():
    """使用新的token测试记录创建"""
    from app import create_app
    from app.models.user import User
    from app.models.record import Record, db
    import jwt
    from jwt.jwk import OctetJWK
    
    app = create_app()
    
    with app.app_context():
        with app.test_client() as client:
            # 1. 先登录获取新token
            print("1. 登录获取新token...")
            login_data = {
                'username': 'testlogin',
                'password': 'TestLogin123!'
            }
            
            login_response = client.post('/api/auth/login', json=login_data)
            print(f"登录状态码: {login_response.status_code}")
            
            if login_response.status_code != 200:
                print("登录失败")
                return
            
            login_result = login_response.get_json()
            access_token = login_result['access_token']
            user_info = login_result['user']
            print(f"用户ID: {user_info['id']}")
            print(f"用户名: {user_info['username']}")
            
            # 2. 立即创建记录（避免token过期）
            print("\n2. 立即创建记录...")
            record_data = {
                'content': '测试任务：验证用户ID关联',
                'category': 'task',
                'task_type': 'work',
                'priority': 'medium'
            }
            
            headers = {
                'Authorization': f'Bearer {access_token}'
            }
            
            create_response = client.post('/api/records', json=record_data, headers=headers)
            print(f"创建记录状态码: {create_response.status_code}")
            
            if create_response.status_code == 201:
                record = create_response.get_json()['record']
                print(f"✅ 记录创建成功!")
                print(f"记录ID: {record['id']}")
                print(f"记录内容: {record['content']}")
                print(f"用户ID: {record.get('user_id', 'None')}")
                
                # 3. 验证记录是否属于当前用户
                if record.get('user_id') == user_info['id']:
                    print("✅ 用户ID关联正确!")
                else:
                    print(f"❌ 用户ID关联错误! 期望: {user_info['id']}, 实际: {record.get('user_id')}")
                
                # 4. 验证数据库中的记录
                print("\n3. 验证数据库中的记录...")
                db_record = Record.query.get(record['id'])
                if db_record:
                    print(f"数据库记录用户ID: {db_record.user_id}")
                    if db_record.user_id == user_info['id']:
                        print("✅ 数据库中的用户ID关联正确!")
                    else:
                        print(f"❌ 数据库中的用户ID关联错误!")
                else:
                    print("❌ 在数据库中找不到记录")
                    
            else:
                print("❌ 记录创建失败")
                print(f"错误信息: {create_response.get_json()}")
                
            # 5. 测试匿名用户创建记录
            print("\n4. 测试匿名用户创建记录...")
            anonymous_record_data = {
                'content': '匿名用户测试任务',
                'category': 'task',
                'task_type': 'work',
                'priority': 'low'
            }
            
            anonymous_response = client.post('/api/records', json=anonymous_record_data)
            print(f"匿名用户创建记录状态码: {anonymous_response.status_code}")
            
            if anonymous_response.status_code == 201:
                anonymous_record = anonymous_response.get_json()['record']
                print(f"✅ 匿名用户记录创建成功!")
                print(f"记录ID: {anonymous_record['id']}")
                print(f"用户ID: {anonymous_record.get('user_id', 'None')}")
                
                if anonymous_record.get('user_id') is None:
                    print("✅ 匿名用户ID关联正确!")
                else:
                    print(f"❌ 匿名用户ID关联错误! 期望: None, 实际: {anonymous_record.get('user_id')}")

if __name__ == '__main__':
    test_record_creation_fresh()
