import os
from app.database import db
from sqlalchemy import inspect, text

def init_database_enhanced(app):
    """增强版数据库初始化，包含用户认证系统"""
    # 数据库配置
    basedir = os.path.abspath(os.path.dirname(__file__))
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(basedir, "../../../data/aigtd.db")}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # 初始化数据库
    db.init_app(app)
    
    with app.app_context():
        # 创建所有表
        db.create_all()
        
        # 导入模型（避免循环导入）
        from app.models.user import User
        from app.models.record import Record
        
        # 添加用户ID外键到records表（如果不存在）
        try:
            inspector = inspect(db.engine)
            columns = [col['name'] for col in inspector.get_columns('records')]
            
            if 'user_id' not in columns:
                # 添加用户ID列
                db.session.execute(text('ALTER TABLE records ADD COLUMN user_id INTEGER'))
                db.session.execute(text('CREATE INDEX IF NOT EXISTS ix_records_user_id ON records(user_id)'))
                db.session.commit()
                print("✅ 已添加用户ID列到records表")
                
        except Exception as e:
            print(f"⚠️  添加用户ID列时出错: {e}")
            db.session.rollback()
        
        # 创建默认管理员用户（如果不存在）
        try:
            admin_user = User.find_by_username('admin')
            if not admin_user:
                admin_user = User.create_user(
                    username='admin',
                    email='admin@aigtd.com',
                    password='admin123!',
                    first_name='系统',
                    last_name='管理员',
                    is_admin=True,
                    is_verified=True
                )
                print("✅ 已创建默认管理员用户")
            else:
                print("ℹ️  管理员用户已存在")
                
        except Exception as e:
            print(f"⚠️  创建管理员用户时出错: {e}")
            db.session.rollback()
        
        print("✅ 数据库初始化完成，包含用户认证系统")
    
    return db