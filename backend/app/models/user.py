from app.database import db
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import jwt
import secrets
from typing import Optional, Dict, Any

class User(db.Model):
    """用户数据模型"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    
    # 用户基本信息
    first_name = db.Column(db.String(50), nullable=True)
    last_name = db.Column(db.String(50), nullable=True)
    avatar_url = db.Column(db.String(255), nullable=True)
    
    # 账户状态
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)
    is_admin = db.Column(db.Boolean, default=False)
    
    # 安全相关
    failed_login_attempts = db.Column(db.Integer, default=0)
    last_failed_login = db.Column(db.DateTime, nullable=True)
    account_locked_until = db.Column(db.DateTime, nullable=True)
    
    # Token相关
    refresh_token = db.Column(db.String(255), nullable=True)
    refresh_token_expires_at = db.Column(db.DateTime, nullable=True)
    
    # 时间戳
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = db.Column(db.DateTime, nullable=True)
    
    # 关系定义
    records = db.relationship('Record', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    
    def set_password(self, password: str) -> None:
        """设置密码哈希"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password: str) -> bool:
        """验证密码"""
        return check_password_hash(self.password_hash, password)
    
    def generate_access_token(self, expires_in: int = 900) -> str:
        """生成访问Token (默认15分钟)"""
        payload = {
            'user_id': self.id,
            'username': self.username,
            'email': self.email,
            'exp': datetime.utcnow() + timedelta(seconds=expires_in),
            'iat': datetime.utcnow(),
            'type': 'access'
        }
        return jwt.encode(payload, self._get_secret_key(), algorithm='HS256')
    
    def generate_refresh_token(self, expires_in: int = 604800) -> str:
        """生成刷新Token (默认7天)"""
        token = secrets.token_urlsafe(32)
        self.refresh_token = token
        self.refresh_token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        return token
    
    def verify_token(self, token: str, token_type: str = 'access') -> Optional[Dict[str, Any]]:
        """验证Token"""
        try:
            payload = jwt.decode(token, self._get_secret_key(), algorithms=['HS256'])
            
            # 验证Token类型
            if payload.get('type') != token_type:
                return None
                
            # 验证用户ID匹配
            if payload.get('user_id') != self.id:
                return None
                
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def is_account_locked(self) -> bool:
        """检查账户是否被锁定"""
        if self.account_locked_until:
            return datetime.utcnow() < self.account_locked_until
        return False
    
    def lock_account(self, duration_minutes: int = 30) -> None:
        """锁定账户"""
        self.account_locked_until = datetime.utcnow() + timedelta(minutes=duration_minutes)
    
    def unlock_account(self) -> None:
        """解锁账户"""
        self.account_locked_until = None
        self.failed_login_attempts = 0
    
    def record_failed_login(self) -> None:
        """记录失败登录"""
        self.failed_login_attempts += 1
        self.last_failed_login = datetime.utcnow()
        
        # 5次失败后锁定账户30分钟
        if self.failed_login_attempts >= 5:
            self.lock_account(30)
    
    def record_successful_login(self) -> None:
        """记录成功登录"""
        self.last_login_at = datetime.utcnow()
        self.failed_login_attempts = 0
        self.last_failed_login = None
    
    def is_refresh_token_valid(self) -> bool:
        """检查刷新Token是否有效"""
        if not self.refresh_token or not self.refresh_token_expires_at:
            return False
        return datetime.utcnow() < self.refresh_token_expires_at
    
    def revoke_refresh_token(self) -> None:
        """撤销刷新Token"""
        self.refresh_token = None
        self.refresh_token_expires_at = None
    
    def get_full_name(self) -> str:
        """获取全名"""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        elif self.first_name:
            return self.first_name
        elif self.last_name:
            return self.last_name
        else:
            return self.username
    
    def to_dict(self, include_sensitive: bool = False) -> Dict[str, Any]:
        """转换为字典"""
        data = {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'avatar_url': self.avatar_url,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'is_admin': self.is_admin,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'last_login_at': self.last_login_at.isoformat() if self.last_login_at else None,
        }
        
        if include_sensitive:
            data.update({
                'failed_login_attempts': self.failed_login_attempts,
                'account_locked_until': self.account_locked_until.isoformat() if self.account_locked_until else None,
            })
        
        return data
    
    def verify_email(self) -> None:
        """验证邮箱"""
        self.is_verified = True
    
    def deactivate(self) -> None:
        """停用账户"""
        self.is_active = False
    
    def activate(self) -> None:
        """激活账户"""
        self.is_active = True
    
    @staticmethod
    def _get_secret_key() -> str:
        """获取JWT密钥"""
        from flask import current_app
        return current_app.config.get('JWT_SECRET_KEY', 'your-secret-key-here')
    
    @classmethod
    def find_by_email(cls, email: str) -> Optional['User']:
        """根据邮箱查找用户"""
        return cls.query.filter_by(email=email).first()
    
    @classmethod
    def find_by_username(cls, username: str) -> Optional['User']:
        """根据用户名查找用户"""
        return cls.query.filter_by(username=username).first()
    
    @classmethod
    def find_by_id(cls, user_id: int) -> Optional['User']:
        """根据ID查找用户"""
        return cls.query.get(user_id)
    
    @classmethod
    def create_user(cls, username: str, email: str, password: str, **kwargs) -> 'User':
        """创建新用户"""
        user = cls(
            username=username,
            email=email,
            **kwargs
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        return user
    
    def __repr__(self) -> str:
        return f'<User {self.id}: {self.username}>'