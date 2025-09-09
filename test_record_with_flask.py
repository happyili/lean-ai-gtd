#!/usr/bin/env python3
import sys
import os
sys.path.append('backend')

def test_record_creation():
    """使用Flask测试客户端测试记录创建"""
    from app import create_app
    from app.models.user import User
    from app.models.record import Record, db
    import jwt
    from jwt.jwk import OctetJWK
    
    app = create_app()
    
    with app.app_context():
        with app.test_client() as client:
            # 1. 先登录获取token
            print("1. 登录获取token...")
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
            
            # 2. 验证token解析
            print("\n2. 验证token解析...")
            try:
                secret_key = app.config.get('JWT_SECRET_KEY', 'your-secret-key-here')
                jwk = OctetJWK(secret_key.encode('utf-8'))
                jwt_instance = jwt.JWT()
                payload = jwt_instance.decode(access_token, jwk)
                print(f"Token解析成功，用户ID: {payload['user_id']}")
                
                # 查找用户
                user = User.find_by_id(payload['user_id'])
                print(f"找到用户: {user.username if user else 'None'}")
            except Exception as e:
                print(f"Token解析失败: {e}")
                return
            
            # 3. 创建记录
            print("\n3. 创建记录...")
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
                
                # 4. 验证记录是否属于当前用户
                if record.get('user_id') == user_info['id']:
                    print("✅ 用户ID关联正确!")
                else:
                    print(f"❌ 用户ID关联错误! 期望: {user_info['id']}, 实际: {record.get('user_id')}")
                
                # 5. 验证数据库中的记录
                print("\n4. 验证数据库中的记录...")
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

if __name__ == '__main__':
    test_record_creation()
