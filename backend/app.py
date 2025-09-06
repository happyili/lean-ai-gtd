from flask import Flask
from flask_cors import CORS
from app.database.init import init_database
from app.routes.records import records_bp
import os

def create_app():
    """创建Flask应用"""
    app = Flask(__name__)
    
    # 启用CORS支持
    CORS(app)

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

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5050) 