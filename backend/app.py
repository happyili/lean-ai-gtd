from flask import Flask
from flask_cors import CORS
from app.database.init import init_database
from app.routes.records import records_bp
from app.routes.auth import auth_bp
from app.routes.pomodoro import pomodoro_bp
from app.routes.info_resources import info_resources_bp
from app.routes.reminders import reminders_bp
import os

def create_app():
    """创建Flask应用"""
    app = Flask(__name__)
    
    # 配置CORS支持 - 明确指定允许的来源和方法
    CORS(app, 
         origins=['http://localhost:3000', 'http://127.0.0.1:3000'],  # 前端开发服务器地址
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
         allow_headers=['Content-Type', 'Authorization', 'X-Requested-With'],
         supports_credentials=True)

    # JWT配置
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-here')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 900  # 15分钟
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = 604800  # 7天
    
    # 初始化数据库
    init_database(app)
    
    # 注册路由
    app.register_blueprint(records_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(pomodoro_bp)
    app.register_blueprint(info_resources_bp)
    app.register_blueprint(reminders_bp)
    
    # 添加全局OPTIONS处理器
    @app.before_request
    def handle_preflight():
        from flask import request, make_response
        if request.method == "OPTIONS":
            response = make_response()
            response.headers.add("Access-Control-Allow-Origin", "*")
            response.headers.add('Access-Control-Allow-Headers', "*")
            response.headers.add('Access-Control-Allow-Methods', "*")
            return response
    
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
