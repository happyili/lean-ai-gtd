from app.database import db
from datetime import datetime

class PomodoroTask(db.Model):
    """番茄任务数据模型 - AI生成的高效工作任务"""
    __tablename__ = 'pomodoro_tasks'
    
    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)  # 使用自增ID
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.id'), nullable=False)  # 所属用户
    
    # AI生成的任务内容
    title = db.Column(db.String(200), nullable=False)  # 简短的任务标题
    description = db.Column(db.Text, nullable=True)  # 详细描述和context
    related_task_ids = db.Column(db.Text, nullable=True)  # 关联的原始任务ID列表（JSON格式）
    
    # 任务属性
    priority_score = db.Column(db.Integer, default=0)  # AI评估的优先级分数
    estimated_pomodoros = db.Column(db.Integer, default=1)  # 预估需要的番茄钟数
    order_index = db.Column(db.Integer, nullable=False)  # 在top5中的排序（1-5）
    
    # 执行状态
    status = db.Column(db.String(20), default='pending')  # pending/active/completed/skipped
    started_at = db.Column(db.DateTime, nullable=True)  # 开始时间
    completed_at = db.Column(db.DateTime, nullable=True)  # 完成时间
    
    # 番茄钟统计
    pomodoros_completed = db.Column(db.Integer, default=0)  # 已完成的番茄钟数
    total_focus_time = db.Column(db.Integer, default=0)  # 总专注时间（分钟）
    
    # AI生成信息
    generation_context = db.Column(db.Text, nullable=True)  # 生成时的上下文信息
    ai_reasoning = db.Column(db.Text, nullable=True)  # AI的推理过程
    
    # 时间戳
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    user = db.relationship('User', backref='pomodoro_tasks')
    
    def __init__(self, **kwargs):
        """初始化番茄任务"""
        super(PomodoroTask, self).__init__(**kwargs)
    
    def to_dict(self):
        """转换为字典格式"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'description': self.description,
            'related_task_ids': self.related_task_ids,
            'priority_score': self.priority_score,
            'estimated_pomodoros': self.estimated_pomodoros,
            'order_index': self.order_index,
            'status': self.status,
            'started_at': self.started_at.isoformat() + 'Z' if self.started_at else None,
            'completed_at': self.completed_at.isoformat() + 'Z' if self.completed_at else None,
            'pomodoros_completed': self.pomodoros_completed,
            'total_focus_time': self.total_focus_time,
            'generation_context': self.generation_context,
            'ai_reasoning': self.ai_reasoning,
            'created_at': self.created_at.isoformat() + 'Z' if self.created_at else None,
            'updated_at': self.updated_at.isoformat() + 'Z' if self.updated_at else None
        }
    
    def start_pomodoro(self):
        """开始番茄钟"""
        if self.status == 'pending':
            self.status = 'active'
            self.started_at = datetime.utcnow()
            return True
        return False
    
    def complete_pomodoro(self, focus_minutes=25):
        """完成一个番茄钟"""
        if self.status == 'active':
            self.pomodoros_completed += 1
            self.total_focus_time += focus_minutes
            
            # 如果完成了预估的番茄钟数，标记任务完成
            if self.pomodoros_completed >= self.estimated_pomodoros:
                self.status = 'completed'
                self.completed_at = datetime.utcnow()
            
            return True
        return False
    
    def skip_task(self):
        """跳过任务"""
        self.status = 'skipped'
        return True

    def reset_task(self):
        """将任务重置为未开始状态"""
        # 重置到pending，并清空计时与完成信息
        self.status = 'pending'
        self.started_at = None
        self.completed_at = None
        self.pomodoros_completed = 0
        self.total_focus_time = 0
        return True
    
    def get_related_tasks(self):
        """获取关联的原始任务"""
        if not self.related_task_ids:
            return []
        
        try:
            import json
            from app.models.record import Record
            task_ids = json.loads(self.related_task_ids)
            return Record.query.filter(Record.id.in_(task_ids)).all()
        except:
            return []
    
    def get_progress_percentage(self):
        """获取完成进度百分比"""
        if self.estimated_pomodoros == 0:
            return 0
        return min(100, int((self.pomodoros_completed / self.estimated_pomodoros) * 100))
    
    @classmethod
    def get_user_current_tasks(cls, user_id):
        """获取用户当前的番茄任务"""
        return cls.query.filter_by(
            user_id=user_id
        ).order_by(cls.order_index.asc()).all()
    
    @classmethod
    def clear_user_tasks(cls, user_id):
        """清除用户的所有番茄任务"""
        cls.query.filter_by(user_id=user_id).delete()
        db.session.commit()
    
    def __repr__(self):
        return f'<PomodoroTask {self.id}: {self.title[:30]}...>'
