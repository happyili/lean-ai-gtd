import os
from flask_sqlalchemy import SQLAlchemy
from app.models.record import db
from sqlalchemy import inspect, text

def init_database(app):
    """统一的数据库初始化函数 - 支持Supabase和本地SQLite"""
    
    # 配置数据库连接
    database_url = os.getenv('DATABASE_URL')

    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    print("🔗 使用数据库连接 (Supabase或本地数据库): ", database_url)
    print("   如使用本地数据库，请确保当前路径存在。")

    # app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    #     'pool_timeout': 20,
    #     'pool_recycle': -1,
    #     'pool_pre_ping': True,
    #     'connect_args': {
    #         'connect_timeout': 10,
    #         'application_name': 'aigtd-backend'
    #     }
    # }

    # 初始化数据库
    db.init_app(app)
    
    with app.app_context():
        try:
            # 测试数据库连接
            db.session.execute(text('SELECT 1'))
            print("✅ 数据库连接成功")
            
            # 创建所有表（仅在非Supabase环境下）
            if not database_url or 'supabase' not in database_url.lower():
                db.create_all()
                print("✅ 数据库表创建完成")
                
                # 导入模型（避免循环导入）
                from app.models.user import User
                from app.models.record import Record
                from app.models.info_resource import InfoResource
                from app.models.pomodoro_task import PomodoroTask
                from app.models.reminder import Reminder
                
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
                            password='admin123',
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
            else:
                print("ℹ️  Supabase环境，跳过表创建（由迁移文件管理）")
                
                # 在Supabase环境中，尝试创建默认管理员用户（如果不存在）
                try:
                    from app.models.user import User
                    admin_user = User.find_by_username('admin')
                    if not admin_user:
                        admin_user = User.create_user(
                            username='admin',
                            email='admin@aigtd.com',
                            password='admin123',
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
                
        except Exception as e:
            print(f"❌ 数据库初始化失败: {e}")
            raise
    
    print("✅ 数据库初始化完成")
    return db
