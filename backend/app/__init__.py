from flask import Flask
from flask_cors import CORS
from app.database.init import init_database
from app.routes.records import records_bp
from app.routes.auth import auth_bp
import os

def create_app():
    """创建Flask应用"""
    app = Flask(__name__)
    
    # 启用CORS支持
    CORS(app)

    # JWT配置
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-here')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 900  # 15分钟
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = 604800  # 7天
    
    # 初始化数据库
    init_database(app)
    
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