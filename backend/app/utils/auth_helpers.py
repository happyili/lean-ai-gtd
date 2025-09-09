from flask import request, current_app
from app.models.user import User
import jwt
from typing import Optional

def get_current_user() -> Optional[User]:
    """
    从请求头中解析JWT token并返回当前用户
    支持Bearer token格式
    返回None表示未认证或token无效
    """
    current_user = None
    auth_header = request.headers.get('Authorization')
    
    if auth_header:
        try:
            # 解析Bearer token
            token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
            
            # 使用PyJWT解析token
            secret_key = current_app.config.get('JWT_SECRET_KEY', 'your-secret-key-here')
            payload = jwt.decode(token, secret_key, algorithms=['HS256'])
            
            # 查找用户
            current_user = User.find_by_id(payload['user_id'])
            
            # 验证用户状态
            if current_user and not current_user.is_active:
                current_user = None
                
            # 检查账户是否被锁定
            if current_user and current_user.is_account_locked():
                current_user = None
                
        except Exception as e:
            # token解析失败，继续作为匿名用户处理
            current_app.logger.debug(f"Token解析失败: {e}")
            current_user = None
    
    return current_user

def get_user_for_record_access() -> tuple[Optional[User], str, Optional[str]]:
    """
    获取用户用于记录访问权限判断
    返回 (user, access_level, error) 元组
    access_level: 'admin', 'user', 'guest'  
    error: None表示正常，字符串表示错误信息
    """
    auth_header = request.headers.get('Authorization')
    
    # 如果没有Authorization头，则为guest用户
    if not auth_header:
        return None, 'guest', None
    
    # 如果有Authorization头，则必须是有效token
    try:
        # 解析Bearer token
        token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
        
        # 使用PyJWT解析token
        secret_key = current_app.config.get('JWT_SECRET_KEY', 'your-secret-key-here')
        payload = jwt.decode(token, secret_key, algorithms=['HS256'])
        
        # 查找用户
        user = User.find_by_id(payload['user_id'])
        
        if not user:
            return None, 'guest', 'User not found'
        
        # 验证用户状态
        if not user.is_active:
            return None, 'guest', 'Account is disabled'
            
        # 检查账户是否被锁定
        if user.is_account_locked():
            return None, 'guest', 'Account is locked'
        
        # 返回用户信息
        if user.is_admin:
            return user, 'admin', None
        else:
            return user, 'user', None
            
    except Exception as e:
        # token解析失败
        current_app.logger.debug(f"Token解析失败: {e}")
        return None, 'guest', 'Invalid token'