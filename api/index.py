from flask import Flask
from flask_cors import CORS
import os
import sys

# 添加backend路径到sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.database.init import init_database
from app.routes.records import records_bp

def create_app():
    """创建Flask应用"""
    app = Flask(__name__)
    
    # 启用CORS支持
    CORS(app)
    
    # 配置数据库连接
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # 初始化数据库
    init_database(app)
    
    # 注册路由
    app.register_blueprint(records_bp)
    
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
