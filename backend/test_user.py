#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app import create_app
from app.models.user import User, db

def test_user():
    app = create_app()
    with app.app_context():
        user = User.find_by_username('testuser')
        if user:
            print('找到用户:', user.username)
            print('用户ID:', user.id)
            print('用户邮箱:', user.email)
            print('密码哈希:', user.password_hash[:50] + '...' if user.password_hash else 'None')
            print('用户激活状态:', user.is_active)
            print('账户是否锁定:', user.is_account_locked())
            print('失败登录次数:', user.failed_login_attempts)
            
            # 测试密码验证
            test_passwords = ['Test123!@#', 'testpassword', 'password123', 'admin123', '123456']
            for pwd in test_passwords:
                result = user.check_password(pwd)
                print(f'密码 "{pwd}" 验证结果:', result)
                
            # 直接测试Werkzeug的check_password_hash函数
            from werkzeug.security import check_password_hash
            for pwd in test_passwords:
                direct_result = check_password_hash(user.password_hash, pwd)
                print(f'直接验证 "{pwd}":', direct_result)
        else:
            print('用户不存在')
            
        # 列出所有用户
        all_users = User.query.all()
        print(f'\n数据库中共有 {len(all_users)} 个用户:')
        for u in all_users:
            print(f'  - {u.username} ({u.email})')

if __name__ == '__main__':
    test_user()
