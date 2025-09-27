"""
思考记录模型
存储用户使用结构化思考工具的记录
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import db


class ThinkingRecord(db.Model):
    """思考记录模型"""
    __tablename__ = 'thinking_records'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    template_id = Column(String(50), nullable=False)  # 思考模板ID
    template_name = Column(String(100), nullable=False)  # 思考模板名称
    title = Column(String(200), nullable=False)  # 思考记录标题
    questions = Column(JSON, nullable=False)  # 问题列表
    answers = Column(JSON, nullable=False)  # 答案字典 {question_index: answer}
    is_completed = Column(Integer, default=0)  # 0: 进行中, 1: 已完成
    total_time_spent = Column(Integer, default=0)  # 总耗时（分钟）
    tags = Column(String(500), default='')  # 标签，逗号分隔
    summary = Column(Text, default='')  # 思考总结
    insights = Column(Text, default='')  # 关键洞察
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    user = relationship("User", back_populates="thinking_records")
    
    def to_dict(self):
        """转换为字典格式"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'template_id': self.template_id,
            'template_name': self.template_name,
            'title': self.title,
            'questions': self.questions,
            'answers': self.answers,
            'is_completed': bool(self.is_completed),
            'total_time_spent': self.total_time_spent,
            'tags': self.tags.split(',') if self.tags else [],
            'summary': self.summary,
            'insights': self.insights,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'completion_rate': len([a for a in self.answers.values() if a.strip()]) / len(self.questions) if self.questions else 0
        }
    
    def get_progress_summary(self):
        """获取进度摘要"""
        total_questions = len(self.questions) if self.questions else 0
        answered_questions = len([a for a in self.answers.values() if a.strip()]) if self.answers else 0
        
        return {
            'total_questions': total_questions,
            'answered_questions': answered_questions,
            'completion_rate': (answered_questions / total_questions * 100) if total_questions > 0 else 0,
            'is_completed': self.is_completed,
            'time_spent': self.total_time_spent
        }
    
    @classmethod
    def create_new_record(cls, user_id: int, template_id: str, template_name: str, 
                         questions: list, title: str = None):
        """创建新的思考记录"""
        if not title:
            title = f"{template_name} - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        
        record = cls(
            user_id=user_id,
            template_id=template_id,
            template_name=template_name,
            title=title,
            questions=questions,
            answers={}
        )
        
        db.session.add(record)
        db.session.commit()
        return record
    
    def update_answer(self, question_index: int, answer: str):
        """更新答案"""
        if not self.answers:
            self.answers = {}
        
        self.answers[str(question_index)] = answer
        self.updated_at = datetime.utcnow()
        
        # 检查是否全部完成
        if len([a for a in self.answers.values() if a.strip()]) == len(self.questions):
            self.is_completed = 1
        
        db.session.commit()
    
    def update_summary_and_insights(self, summary: str, insights: str):
        """更新总结和洞察"""
        self.summary = summary
        self.insights = insights
        self.updated_at = datetime.utcnow()
        db.session.commit()
    
    def add_time_spent(self, minutes: int):
        """增加耗时"""
        self.total_time_spent += minutes
        self.updated_at = datetime.utcnow()
        db.session.commit()
    
    def mark_completed(self):
        """标记为完成"""
        self.is_completed = 1
        self.updated_at = datetime.utcnow()
        db.session.commit()
