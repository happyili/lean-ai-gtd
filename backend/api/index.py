from flask import Flask
from flask_cors import CORS
import os
import sys

# 添加backend路径到sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.database.init import init_database
from app.routes.records import records_bp
from app.routes.auth import auth_bp

def create_app():
    """创建Flask应用"""
    app = Flask(__name__)
    
    # 启用CORS支持 - 允许所有来源
    CORS(app, origins=['*'])
    
    # JWT配置
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-here')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 900  # 15分钟
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = 604800  # 7天
    
    # 添加错误处理
    @app.errorhandler(Exception)
    def handle_exception(e):
        print(f"❌ 应用错误: {str(e)}")
        print(f"❌ 错误类型: {type(e).__name__}")
        import traceback
        print(f"❌ 错误堆栈: {traceback.format_exc()}")
        return {'error': str(e), 'type': type(e).__name__}, 500
    
    try:
        # 初始化数据库
        print("🔄 开始初始化数据库...")
        init_database(app)
        print("✅ 数据库初始化完成")
    except Exception as e:
        print(f"❌ 数据库初始化失败: {str(e)}")
        import traceback
        print(f"❌ 错误堆栈: {traceback.format_exc()}")
        raise
    
    # 注册路由
    app.register_blueprint(records_bp)
    app.register_blueprint(auth_bp)
    
    @app.route('/')
    def index():
        return {'message': 'AIGTD API 服务运行中', 'version': '1.0.0'}
    
    @app.route('/health')
    def health():
        return {'status': 'healthy'}
    
    return app

# 创建应用实例
app = create_app()

# Vercel Python运行时
if __name__ == '__main__':
    app.run(debug=True)