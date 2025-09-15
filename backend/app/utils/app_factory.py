"""
统一的Flask应用配置模块
提供标准化的应用创建和错误处理功能
"""

from flask import Flask, request
from flask_cors import CORS
from app.database.init import init_database
from app.routes.records import records_bp
from app.routes.auth import auth_bp
from app.routes.pomodoro import pomodoro_bp
from app.routes.info_resources import info_resources_bp
from app.routes.reminders import reminders_bp
from app.utils.app_logger import debug_log
from app.utils.response_helpers import create_error_response, ErrorCodes

import os, json, logging, traceback
from datetime import datetime

def configure_logging():
    """配置统一的日志级别"""
    # 控制 Werkzeug 日志
    # if os.getenv('DISABLE_WERKZEUG_LOGS', 'false').lower() == 'true':
    #     logging.getLogger('werkzeug').setLevel(logging.WARNING)
    #     debug_log.info('✅ Werkzeug 日志已禁用')
    # else:
    #     debug_log.info('ℹ️  Werkzeug 日志保持启用')
    
    # 控制其他库的日志级别
    logging.getLogger('werkzeug').disabled = True
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('requests').setLevel(logging.WARNING)



def setup_request_logging(app):
    """为Flask应用设置请求日志记录"""
    
    @app.before_request
    def log_request_start():
        """记录请求开始"""        
        # 获取环境变量配置
        header_length = int(os.getenv('LOG_HEADER_LENGTH', '100'))
        payload_length = int(os.getenv('LOG_REQUEST_PAYLOAD_LENGTH', '200'))
        query_length = int(os.getenv('LOG_QUERY_LENGTH', '200'))
        
        # 记录所有API请求的开始
        if request.path.startswith('/api/'):
            
            # 准备日志数据
            log_data = {}
            
            # 1. 记录查询参数（如果配置了长度）
            if query_length > 0 and request.args:
                query_dict = dict(request.args)
                # 使用 ensure_ascii=False 避免转义，并去掉多余的引号
                query_str = json.dumps(query_dict, ensure_ascii=False, separators=(',', ':'))
                if len(query_str) > query_length:
                    query_str = query_str[:query_length] + "..."
                log_data['query'] = query_str
            
            # 2. 记录请求头（如果配置了长度）
            if header_length > 0:
                headers_dict = dict(request.headers)
                # 使用 ensure_ascii=False 避免转义
                headers_str = json.dumps(headers_dict, ensure_ascii=False, separators=(',', ':'))
                if len(headers_str) > header_length:
                    headers_str = headers_str[:header_length] + "..."
                log_data['headers'] = headers_str
            
            # 3. 记录请求体（如果配置了长度）
            if payload_length > 0:
                try:
                    # 获取请求体
                    if request.is_json:
                        payload = request.get_json(silent=True)
                        if payload:
                            # 使用 ensure_ascii=False 避免转义
                            payload_str = json.dumps(payload, ensure_ascii=False, separators=(',', ':'))
                            if len(payload_str) > payload_length:
                                payload_str = payload_str[:payload_length] + "..."
                            log_data['payload'] = payload_str
                    elif request.form:
                        form_data = dict(request.form)
                        # 使用 ensure_ascii=False 避免转义
                        form_str = json.dumps(form_data, ensure_ascii=False, separators=(',', ':'))
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


def setup_cors_handler(app):
    """设置CORS预检请求处理器"""
    
    @app.before_request
    def handle_preflight():
        """处理OPTIONS预检请求"""
        from flask import request, make_response
        if request.method == "OPTIONS":
            response = make_response()
            response.headers.add("Access-Control-Allow-Origin", "*")
            response.headers.add('Access-Control-Allow-Headers', "*")
            response.headers.add('Access-Control-Allow-Methods', "*")
            return response


def setup_response_handlers(app):
    """设置统一的错误处理器"""
    
    @app.after_request
    def log_response_info(response):
        """记录响应信息"""
        debug_log.info("📤 发送响应", {
            'status_code': response.status_code,
            'headers': dict(response.headers),
            'data': response.get_json() if response.is_json else None
        })
        return response


def setup_error_handlers(app):
    """设置统一的错误处理器"""
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        """处理应用异常 - 使用统一的错误响应格式"""
        return create_error_response(
            error_code=ErrorCodes.UNKNOWN_ERROR,
            error_details=f"应用内部错误: {str(e)} \r\n Tracback: {traceback.format_exc()}",
            status_code=500,
            method=request.method if request else None,
            endpoint=request.path if request else None
        )


def setup_basic_routes(app):
    """设置基本路由"""
    
    @app.route('/')
    def index():
        debug_log.info("🏠 访问首页")
        return {'message': 'AIGTD API 服务运行中', 'version': '1.0.0'}
    
    @app.route('/health')
    def health():
        debug_log.info("🏥 健康检查")
        return {'status': 'healthy'}
    
    @app.route('/favicon.ico')
    def favicon():
        return {}
    
    @app.route('/debug/logs')
    def debug_logs():
        """调试日志端点 - 返回最近的日志"""
        debug_log.info("🔍 访问调试日志端点")
        return {
            'message': '调试日志端点',
            'timestamp': debug_log.logger.handlers[0].stream.getvalue() if debug_log.logger.handlers else 'No logs available',
            'environment': {
                'DATABASE_URL': 'SET' if os.getenv('DATABASE_URL') else 'NOT_SET',
                'JWT_SECRET_KEY': 'SET' if os.getenv('JWT_SECRET_KEY') else 'NOT_SET'
            }
        }


def create_base_app():
    """创建基础Flask应用"""
    # 配置日志级别
    configure_logging()
    debug_log.info("🚀 开始创建Flask应用")
    
    app = Flask(__name__)
    
    # 配置CORS支持
    CORS(app, 
         origins=['http://localhost:3000', 'http://127.0.0.1:3000', '*'],  # 支持本地和生产环境
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
         allow_headers=['Content-Type', 'Authorization', 'X-Requested-With'],
         supports_credentials=True)
    debug_log.info("✅ CORS配置完成")
    
    # JWT配置
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-here')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 864000  # 10天 (开发环境)
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = 15552000  # 6个月 (180天)
    debug_log.info("✅ JWT配置完成")
    
    # 设置统一的请求日志记录
    setup_request_logging(app)
    debug_log.info("✅ 请求日志记录设置完成")

    # setup_response_logging(app)
    # debug_log.info("✅ 响应日志记录设置完成")
    
    # 设置CORS预检请求处理器
    setup_cors_handler(app)
    debug_log.info("✅ CORS处理器设置完成")
    
    # 设置错误处理器
    setup_error_handlers(app)
    debug_log.info("✅ 错误处理器设置完成")
    
    try:
        # 初始化数据库
        debug_log.info("🔄 开始初始化数据库")
        database_url = os.getenv('DATABASE_URL', 'Not set')
        debug_log.error("🔍 数据库配置", {'url': database_url})
        
        init_database(app)
        debug_log.info("✅ 数据库初始化完成")
    except Exception as e:
        debug_log.error("❌ 数据库初始化失败", {'error': str(e)})
        debug_log.error("❌ 错误堆栈", {'traceback': traceback.format_exc()})
        raise
    
    # 注册路由
    app.register_blueprint(records_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(pomodoro_bp)
    app.register_blueprint(info_resources_bp)
    app.register_blueprint(reminders_bp)
    debug_log.info("✅ 路由注册完成")
    
    # 设置基本路由
    setup_basic_routes(app)
    debug_log.info("✅ 基本路由设置完成")
    
    debug_log.info("🎉 Flask应用创建完成")
    return app
