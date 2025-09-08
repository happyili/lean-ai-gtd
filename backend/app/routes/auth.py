from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import jwt
import re
from functools import wraps

from app.models.user import User, db
from app.utils.validators import validate_email, validate_password, validate_username
from app.utils.rate_limiter import rate_limit
from app.utils.email_service import send_verification_email, send_password_reset_email

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

def token_required(f):
    """Token验证装饰器"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # 从请求头获取token
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]  # Bearer <token>
            except IndexError:
                return jsonify({'error': '无效的认证头格式'}), 401
        
        if not token:
            return jsonify({'error': 'Token缺失'}), 401
        
        try:
            # 验证token
            payload = jwt.decode(token, current_app.config.get('JWT_SECRET_KEY', 'your-secret-key-here'), algorithms=['HS256'])
            current_user = User.find_by_id(payload['user_id'])
            
            if not current_user:
                return jsonify({'error': '用户不存在'}), 401
                
            if not current_user.is_active:
                return jsonify({'error': '账户已停用'}), 401
                
            # 检查账户是否被锁定
            if current_user.is_account_locked():
                return jsonify({'error': '账户已锁定，请稍后重试'}), 401
                
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token已过期'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': '无效的Token'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

@auth_bp.route('/register', methods=['POST'])
@rate_limit(max_requests=5, window=300)  # 5分钟内最多5次请求
def register():
    """用户注册"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': '请求数据不能为空'}), 400
        
        # 获取必填字段
        username = data.get('username', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        # 验证必填字段
        if not username or not email or not password:
            return jsonify({'error': '用户名、邮箱和密码为必填项'}), 400
        
        # 验证用户名格式
        if not validate_username(username):
            return jsonify({'error': '用户名格式不正确，应为3-20个字符，只能包含字母、数字和下划线'}), 400
        
        # 验证邮箱格式
        if not validate_email(email):
            return jsonify({'error': '邮箱格式不正确'}), 400
        
        # 验证密码强度
        if not validate_password(password):
            return jsonify({'error': '密码强度不够，应为8-32个字符，包含大小写字母、数字和特殊字符'}), 400
        
        # 检查用户名是否已存在
        if User.find_by_username(username):
            return jsonify({'error': '用户名已存在'}), 409
        
        # 检查邮箱是否已存在
        if User.find_by_email(email):
            return jsonify({'error': '邮箱已被注册'}), 409
        
        # 获取可选字段
        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()
        
        # 创建新用户
        user = User.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name if first_name else None,
            last_name=last_name if last_name else None
        )
        
        # 发送验证邮件（异步处理）
        try:
            send_verification_email(user.email, user.generate_access_token())
        except Exception as e:
            current_app.logger.error(f"发送验证邮件失败: {e}")
        
        return jsonify({
            'message': '注册成功，请查看邮箱完成验证',
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"注册失败: {e}")
        db.session.rollback()
        return jsonify({'error': '注册失败，请稍后重试'}), 500

@auth_bp.route('/login', methods=['POST'])
@rate_limit(max_requests=10, window=300)  # 5分钟内最多10次请求
def login():
    """用户登录"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': '请求数据不能为空'}), 400
        
        # 支持用户名或邮箱登录
        login_field = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not login_field or not password:
            return jsonify({'error': '用户名/邮箱和密码为必填项'}), 400
        
        # 查找用户（支持用户名或邮箱）
        user = None
        if '@' in login_field:
            user = User.find_by_email(login_field.lower())
        else:
            user = User.find_by_username(login_field)
        
        if not user:
            return jsonify({'error': '用户名或密码错误'}), 401
        
        # 检查账户是否被锁定
        if user.is_account_locked():
            return jsonify({'error': '账户已锁定，请稍后重试'}), 401
        
        # 验证密码
        if not user.check_password(password):
            user.record_failed_login()
            db.session.commit()
            
            # 检查是否达到锁定条件
            if user.is_account_locked():
                return jsonify({'error': '账户已锁定，请30分钟后再试'}), 401
            
            return jsonify({'error': '用户名或密码错误'}), 401
        
        # 记录成功登录
        user.record_successful_login()
        db.session.commit()
        
        # 生成Token
        access_token = user.generate_access_token()
        refresh_token = user.generate_refresh_token()
        
        return jsonify({
            'message': '登录成功',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': 900,  # 15分钟
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"登录失败: {e}")
        return jsonify({'error': '登录失败，请稍后重试'}), 500

@auth_bp.route('/refresh', methods=['POST'])
def refresh_token():
    """刷新访问Token"""
    try:
        data = request.get_json()
        refresh_token = data.get('refresh_token')
        
        if not refresh_token:
            return jsonify({'error': '刷新Token缺失'}), 400
        
        try:
            # 验证刷新Token
            payload = jwt.decode(refresh_token, current_app.config.get('JWT_SECRET_KEY', 'your-secret-key-here'), algorithms=['HS256'])
            
            if payload.get('type') != 'refresh':
                return jsonify({'error': '无效的Token类型'}), 401
            
            user = User.find_by_id(payload['user_id'])
            if not user:
                return jsonify({'error': '用户不存在'}), 401
            
            if not user.is_refresh_token_valid():
                return jsonify({'error': '刷新Token已过期'}), 401
            
            # 检查用户状态
            if not user.is_active:
                return jsonify({'error': '账户已停用'}), 401
            
            # 生成新的访问Token
            new_access_token = user.generate_access_token()
            
            return jsonify({
                'access_token': new_access_token,
                'token_type': 'Bearer',
                'expires_in': 900
            }), 200
            
        except jwt.ExpiredSignatureError:
            return jsonify({'error': '刷新Token已过期'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': '无效的刷新Token'}), 401
            
    except Exception as e:
        current_app.logger.error(f"刷新Token失败: {e}")
        return jsonify({'error': '刷新Token失败'}), 500

@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout(current_user):
    """用户登出"""
    try:
        # 撤销刷新Token
        current_user.revoke_refresh_token()
        db.session.commit()
        
        return jsonify({'message': '登出成功'}), 200
        
    except Exception as e:
        current_app.logger.error(f"登出失败: {e}")
        db.session.rollback()
        return jsonify({'error': '登出失败'}), 500

@auth_bp.route('/user', methods=['GET'])
@token_required
def get_user(current_user):
    """获取当前用户信息"""
    try:
        return jsonify({
            'user': current_user.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"获取用户信息失败: {e}")
        return jsonify({'error': '获取用户信息失败'}), 500

@auth_bp.route('/user', methods=['PUT'])
@token_required
def update_user(current_user):
    """更新用户信息"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': '请求数据不能为空'}), 400
        
        # 允许更新的字段
        allowed_fields = ['first_name', 'last_name', 'avatar_url']
        
        for field in allowed_fields:
            if field in data:
                setattr(current_user, field, data[field])
        
        db.session.commit()
        
        return jsonify({
            'message': '用户信息更新成功',
            'user': current_user.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"更新用户信息失败: {e}")
        db.session.rollback()
        return jsonify({'error': '更新用户信息失败'}), 500

@auth_bp.route('/change-password', methods=['POST'])
@token_required
def change_password(current_user):
    """修改密码"""
    try:
        data = request.get_json()
        
        old_password = data.get('old_password')
        new_password = data.get('new_password')
        
        if not old_password or not new_password:
            return jsonify({'error': '旧密码和新密码为必填项'}), 400
        
        # 验证旧密码
        if not current_user.check_password(old_password):
            return jsonify({'error': '旧密码错误'}), 400
        
        # 验证新密码强度
        if not validate_password(new_password):
            return jsonify({'error': '新密码强度不够'}), 400
        
        # 设置新密码
        current_user.set_password(new_password)
        db.session.commit()
        
        return jsonify({'message': '密码修改成功'}), 200
        
    except Exception as e:
        current_app.logger.error(f"修改密码失败: {e}")
        db.session.rollback()
        return jsonify({'error': '修改密码失败'}), 500

@auth_bp.route('/verify-email', methods=['POST'])
def verify_email():
    """邮箱验证"""
    try:
        data = request.get_json()
        token = data.get('token')
        
        if not token:
            return jsonify({'error': '验证Token缺失'}), 400
        
        try:
            # 验证Token
            payload = jwt.decode(token, current_app.config.get('JWT_SECRET_KEY', 'your-secret-key-here'), algorithms=['HS256'])
            
            user = User.find_by_id(payload['user_id'])
            if not user:
                return jsonify({'error': '用户不存在'}), 404
            
            if user.is_verified:
                return jsonify({'message': '邮箱已经验证过了'}), 200
            
            # 验证邮箱
            user.verify_email()
            db.session.commit()
            
            return jsonify({'message': '邮箱验证成功'}), 200
            
        except jwt.ExpiredSignatureError:
            return jsonify({'error': '验证Token已过期'}), 400
        except jwt.InvalidTokenError:
            return jsonify({'error': '无效的验证Token'}), 400
            
    except Exception as e:
        current_app.logger.error(f"邮箱验证失败: {e}")
        return jsonify({'error': '邮箱验证失败'}), 500

@auth_bp.route('/health', methods=['GET'])
def health():
    """认证服务健康检查"""
    return jsonify({
        'status': 'healthy',
        'service': 'auth',
        'timestamp': datetime.utcnow().isoformat()
    }), 200

# 工具函数
@auth_bp.route('/check-username', methods=['POST'])
def check_username():
    """检查用户名是否可用"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        
        if not username:
            return jsonify({'error': '用户名不能为空'}), 400
        
        if not validate_username(username):
            return jsonify({'error': '用户名格式不正确'}), 400
        
        existing_user = User.find_by_username(username)
        
        return jsonify({
            'available': existing_user is None,
            'message': '用户名可用' if existing_user is None else '用户名已存在'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"检查用户名失败: {e}")
        return jsonify({'error': '检查用户名失败'}), 500

@auth_bp.route('/check-email', methods=['POST'])
def check_email():
    """检查邮箱是否可用"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        
        if not email:
            return jsonify({'error': '邮箱不能为空'}), 400
        
        if not validate_email(email):
            return jsonify({'error': '邮箱格式不正确'}), 400
        
        existing_user = User.find_by_email(email)
        
        return jsonify({
            'available': existing_user is None,
            'message': '邮箱可用' if existing_user is None else '邮箱已被注册'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"检查邮箱失败: {e}")
        return jsonify({'error': '检查邮箱失败'}), 500

# 错误处理
@auth_bp.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({'error': '请求过于频繁，请稍后重试'}), 429

# 从datetime导入
from datetime import datetime

# 导出蓝图
__all__ = ['auth_bp']// Login API implementation
// Logout API implementation
// Token refresh implementation
// Get user info API
