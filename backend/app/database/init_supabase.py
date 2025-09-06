import os
from flask_sqlalchemy import SQLAlchemy
from app.models.record import db

def init_database(app):
    """初始化数据库 - Supabase版本"""
    # 从环境变量获取数据库URL
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is required")
    
    # 配置数据库连接
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # 初始化数据库
    db.init_app(app)
    
    with app.app_context():
        # 在Supabase中，表结构通过迁移文件创建，这里只需要确保连接正常
        try:
            # 测试数据库连接
            db.session.execute('SELECT 1')
            print("数据库连接成功")
        except Exception as e:
            print(f"数据库连接失败: {e}")
            raise
    
    return db
