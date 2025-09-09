#!/usr/bin/env python3
import sys
import os
sys.path.append('backend')
os.chdir('backend')
from app import create_app
from app.models.user import User, db

def test_login():
    app = create_app()
    with app.app_context():
        # 查找现有用户
        user = User.find_by_username('testuser')
        if user:
            print(f'找到用户: {user.username}')
            print(f'密码验证正确: {user.check_password("Test123!@#")}')
            print(f'密码验证错误: {user.check_password("wrongpassword")}')
            
            # 检查用户状态
            print(f'用户激活状态: {user.is_active}')
            print(f'账户是否锁定: {user.is_account_locked()}')
            print(f'失败登录次数: {user.failed_login_attempts}')
        else:
            print('用户不存在')

if __name__ == '__main__':
    test_login()
