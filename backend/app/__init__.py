from flask import Flask
from flask_cors import CORS
from app.database.init import init_database
from app.routes.records import records_bp
from app.routes.auth import auth_bp
from app.routes.pomodoro import pomodoro_bp
from app.routes.info_resources import info_resources_bp
from app.routes.reminders import reminders_bp
from app.utils.response_helpers import debug_log
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
    
    # 添加全局请求日志记录
    @app.before_request
    def @app.before_request():
        from flask import request
        import os
        import json
         
        header_length = int(os.getenv('LOG_HEADER_LENGTH', '200'))
        payload_length = int(os.getenv('LOG_REQUEST_PAYLOAD_LENGTH', '500'))
        print("=========@app.before_request:  ", payload_length, ": ",  payload_length)
        # 记录所有API请求的开始
        if request.path.startswith('/api/'):
            # 获取环境变量配置
            
            # 准备日志数据
            log_data = {}
            
            # 1. 记录请求头（如果配置了长度）
            print("========= ", payload_length, ": ",  payload_length)
            if header_length > 0:
                headers_str = str(dict(request.headers))
                if len(headers_str) > header_length:
                    headers_str = headers_str[:header_length] + "..."
                log_data['headers'] = headers_str
            
            # 2. 记录请求体（如果配置了长度）
            if payload_length > 0:
                try:
                    # 获取请求体
                    if request.is_json:
                        payload = request.get_json(silent=True)
                        if payload:
                            payload_str = json.dumps(payload, ensure_ascii=False)
                            if len(payload_str) > payload_length:
                                payload_str = payload_str[:payload_length] + "..."
                            log_data['payload'] = payload_str
                    elif request.form:
                        form_data = dict(request.form)
                        form_str = json.dumps(form_data, ensure_ascii=False)
                        if len(form_str) > payload_length:
                            form_str = form_str[:payload_length] + "..."
                        log_data['form_data'] = form_str
                    elif request.data:
                        data_str = request.data.decode('utf-8', errors='ignore')
                        if len(data_str) > payload_length:
                            data_str = data_str[:payload_length] + "..."
                        log_data['raw_data'] = data_str
                except Exception as e:
                    log_data['payload_error'] = f"无法解析请求体: {str(e)}"
            
            debug_log.request_start(request.method, request.path, log_data)
    
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
