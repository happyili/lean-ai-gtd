from flask_sqlalchemy import SQLAlchemy

# 全局数据库实例
db = SQLAlchemy()

# 导入模型以避免循环依赖
def init_models():
    """延迟导入模型以解决循环依赖"""
    from app.models.user import User
    from app.models.record import Record
    return db