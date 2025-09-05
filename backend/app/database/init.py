import os
from flask_sqlalchemy import SQLAlchemy
from app.models.record import db

def init_database(app):
    """初始化数据库"""
    # 数据库配置
    basedir = os.path.abspath(os.path.dirname(__file__))
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(basedir, "../../../data/aigtd.db")}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # 确保数据目录存在
    data_dir = os.path.join(basedir, "../../../data")
    os.makedirs(data_dir, exist_ok=True)
    
    # 初始化数据库
    db.init_app(app)
    
    with app.app_context():
        db.create_all()
        print("数据库初始化完成")
    
    return db 