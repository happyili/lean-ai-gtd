from app.database import db
from app.utils.random_id import RandomIDGenerator
from datetime import datetime

class Record(db.Model):
    """记录数据模型 - 使用随机ID以提高数据安全性"""
    __tablename__ = 'records'
    
    id = db.Column(db.BigInteger, primary_key=True)  # 使用BigInteger支持大随机数
    content = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(20), default='general')  # idea/task/note/general
    parent_id = db.Column(db.BigInteger, db.ForeignKey('records.id'), nullable=True)  # 父任务ID，支持子任务
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.id'), nullable=True)  # 用户ID外键
    priority = db.Column(db.String(20), default='medium')  # low/medium/high/urgent
    progress = db.Column(db.Integer, default=0)  # 进度百分比 0-100
    progress_notes = db.Column(db.Text, nullable=True)  # 进展记录和问题描述
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    status = db.Column(db.String(20), default='active')  # active/completed/paused/cancelled/archived/deleted
    task_type = db.Column(db.String(20), default='work')  # work/hobby/life - 工作/业余/生活
    
    # 关系定义：为支持预加载（selectinload），不要使用 dynamic 集合
    parent = db.relationship(
        'Record',
        remote_side=[id],
        backref=db.backref('subtasks', lazy='selectin')
    )
    
    def __init__(self, **kwargs):
        """初始化记录，自动生成随机ID"""
        # 如果没有提供ID，生成随机ID
        if 'id' not in kwargs or kwargs['id'] is None:
            kwargs['id'] = RandomIDGenerator.generate_record_id()
        super(Record, self).__init__(**kwargs)
    
    def to_dict(self, include_subtasks=False):
        """转换为字典格式"""
        result = {
            'id': self.id,
            'content': self.content,
            'category': self.category,
            'parent_id': self.parent_id,
            'priority': self.priority,
            'progress': self.progress,
            'progress_notes': self.progress_notes,
            'created_at': self.created_at.isoformat() + 'Z' if self.created_at else None,
            'updated_at': self.updated_at.isoformat() + 'Z' if self.updated_at else None,
            'status': self.status,
            'task_type': self.task_type,
            'user_id': self.user_id
        }
        
        if include_subtasks:
            # 仅返回活跃子任务；如已预加载则内存过滤，否则将触发一次加载
            loaded_subtasks = list(self.subtasks)
            active_subtasks = [s for s in loaded_subtasks if s.status == 'active']
            result['subtasks'] = [subtask.to_dict() for subtask in active_subtasks]
            result['subtask_count'] = len(active_subtasks)
        else:
            # 只统计数量；此处会触发一次加载（与原先 .count() 的一次查询等价）
            loaded_subtasks = list(self.subtasks)
            result['subtask_count'] = sum(1 for s in loaded_subtasks if s.status == 'active')
            
        return result
    
    def is_task(self):
        """判断是否为任务"""
        return self.category == 'task'
    
    def is_subtask(self):
        """判断是否为子任务"""
        return self.parent_id is not None
    
    def get_parent(self):
        """获取父任务"""
        if self.parent_id:
            return Record.query.get(self.parent_id)
        return None
    
    def get_subtasks(self, include_inactive=False):
        """获取子任务列表
        当 include_inactive=True 时返回所有状态；否则仅返回 active。
        使用显式查询避免 dynamic 依赖，兼容预加载策略。
        """
        if include_inactive:
            return Record.query.filter_by(parent_id=self.id).all()
        return Record.query.filter_by(parent_id=self.id, status='active').all()
    
    def can_have_subtasks(self):
        """判断是否可以拥有子任务（只有任务类型可以）"""
        return self.is_task()
    
    def add_subtask(self, content, category='task', task_type='work'):
        """添加子任务 - 自动分配随机ID"""
        if not self.can_have_subtasks():
            raise ValueError("只有任务类型才能添加子任务")
        
        subtask = Record(
            content=content,
            category=category,
            parent_id=self.id,
            task_type=task_type,
            user_id=self.user_id  # 继承父任务的用户ID
        )
        
        # 处理ID冲突（极小概率）
        max_retries = 3
        for attempt in range(max_retries):
            try:
                db.session.add(subtask)
                db.session.flush()  # 获取生成的ID但不提交
                return subtask
            except Exception as e:
                db.session.rollback()
                if 'UNIQUE constraint failed' in str(e) or 'duplicate key' in str(e):
                    # ID冲突，重新生成
                    subtask.id = RandomIDGenerator.generate_record_id()
                    if attempt < max_retries - 1:
                        continue
                raise e
                
        return subtask
    
    def __repr__(self):
        return f'<Record {self.id}: {self.content[:50]}...>' 
