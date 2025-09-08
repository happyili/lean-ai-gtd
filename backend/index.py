from flask import Flask
from flask_cors import CORS
import os
import sys

# 添加backend路径到sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.database.init_enhanced import init_database_enhanced
from app.routes.records import records_bp
from app.routes.auth import auth_bp

def create_app():
    """创建Flask应用"""
    app = Flask(__name__)
    
    # 启用CORS支持
    CORS(app)
    
    # 配置数据库连接
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # JWT配置
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-here')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 900  # 15分钟
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = 604800  # 7天
    
    # 初始化数据库
    init_database_enhanced(app)
    
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

# Vercel需要这个handler
def handler(request):
    return app(request.environ, lambda *args: None)
