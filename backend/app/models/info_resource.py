from app.database import db
from datetime import datetime, timezone

class InfoResource(db.Model):
    """信息资源数据模型"""
    __tablename__ = 'info_resources'
    
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    title = db.Column(db.String(200), nullable=False)  # 资源标题
    content = db.Column(db.Text, nullable=False)  # 资源详情
    resource_type = db.Column(db.String(50), default='general')  # 资源类型
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.id'), nullable=True)  # 用户ID外键
    status = db.Column(db.String(20), default='active')  # active/archived/deleted
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # 关系定义
    user = db.relationship('User', backref='info_resources')
    
    def to_dict(self):
        """转换为字典格式"""
        def safe_isoformat(dt):
            """安全地格式化datetime为ISO字符串"""
            if dt is None:
                return None
            # 确保datetime对象有时区信息
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.isoformat()
        
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'resource_type': self.resource_type,
            'user_id': self.user_id,
            'status': self.status,
            'created_at': safe_isoformat(self.created_at),
            'updated_at': safe_isoformat(self.updated_at)
        }
    
    def soft_delete(self):
        """软删除"""
        self.status = 'deleted'
        return True
    
    def archive(self):
        """归档"""
        self.status = 'archived'
        return True
    
    def restore(self):
        """恢复"""
        self.status = 'active'
        return True
    
    @classmethod
    def get_user_resources(cls, user_id, include_deleted=False):
        """获取用户的信息资源"""
        query = cls.query.filter_by(user_id=user_id)
        if not include_deleted:
            query = query.filter(cls.status != 'deleted')
        return query.order_by(cls.created_at.desc()).all()
    
    @classmethod
    def get_guest_resources(cls, include_deleted=False):
        """获取访客的信息资源"""
        query = cls.query.filter(cls.user_id.is_(None))
        if not include_deleted:
            query = query.filter(cls.status != 'deleted')
        return query.order_by(cls.created_at.desc()).all()
    
    def __repr__(self):
        return f'<InfoResource {self.id}: {self.title[:30]}...>'
