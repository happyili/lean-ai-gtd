from flask import Flask, request, g
from flask_cors import CORS
import os
import sys
import json
import logging
from datetime import datetime

# 添加backend路径到sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.database.init import init_database
from app.routes.records import records_bp
from app.routes.auth import auth_bp

# 配置日志系统
def setup_logging():
    """设置日志系统"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    return logging.getLogger(__name__)

logger = setup_logging()

def debug_log(message, data=None, level='INFO'):
    """统一的调试日志函数"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    log_entry = {
        'timestamp': timestamp,
        'level': level,
        'message': message,
        'data': data
    }
    
    # 输出到stdout（Vercel会捕获）
    print(f"[{timestamp}] {level}: {message}")
    if data:
        print(f"[{timestamp}] DATA: {json.dumps(data, ensure_ascii=False, indent=2)}")
    
    # 同时使用Python logging
    if level == 'ERROR':
        logger.error(f"{message} - {data}")
    elif level == 'WARNING':
        logger.warning(f"{message} - {data}")
    else:
        logger.info(f"{message} - {data}")

def create_app():
    """创建Flask应用"""
    debug_log("🚀 开始创建Flask应用")
    
    app = Flask(__name__)
    
    # 启用CORS支持 - 允许所有来源
    CORS(app, origins=['*'])
    debug_log("✅ CORS配置完成")
    
    # JWT配置
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-here')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 900  # 15分钟
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = 604800  # 7天
    debug_log("✅ JWT配置完成")
    
    # 添加请求日志中间件
    @app.before_request
    def log_request_info():
        debug_log("📥 收到请求", {
            'method': request.method,
            'url': request.url,
            'headers': dict(request.headers),
            'args': dict(request.args),
            'data': request.get_json() if request.is_json else None
        })
    
    @app.after_request
    def log_response_info(response):
        debug_log("📤 发送响应", {
            'status_code': response.status_code,
            'headers': dict(response.headers),
            'data': response.get_json() if response.is_json else None
        })
        return response
    
    # 添加错误处理
    @app.errorhandler(Exception)
    def handle_exception(e):
        debug_log("❌ 应用错误", {
            'error': str(e),
            'type': type(e).__name__,
            'traceback': str(e.__traceback__)
        }, 'ERROR')
        return {'error': str(e), 'type': type(e).__name__}, 500
    
    try:
        # 初始化数据库
        debug_log("🔄 开始初始化数据库")
        database_url = os.getenv('DATABASE_URL', 'Not set')
        debug_log("🔍 数据库配置", {'url': database_url}, 'ERROR')
        
        init_database(app)
        debug_log("✅ 数据库初始化完成")
    except Exception as e:
        debug_log("❌ 数据库初始化失败", {'error': str(e)}, 'ERROR')
        import traceback
        debug_log("❌ 错误堆栈", {'traceback': traceback.format_exc()}, 'ERROR')
        raise
    
    # 注册路由
    app.register_blueprint(records_bp)
    app.register_blueprint(auth_bp)
    debug_log("✅ 路由注册完成")
    
    @app.route('/')
    def index():
        debug_log("🏠 访问首页")
        return {'message': 'AIGTD API 服务运行中', 'version': '1.0.0'}
    
    @app.route('/health')
    def health():
        debug_log("🏥 健康检查")
        return {'status': 'healthy'}
    
    @app.route('/favicon.ico')
    def favicon():
        return {}

    @app.route('/debug/logs')
    def debug_logs():
        """调试日志端点 - 返回最近的日志"""
        debug_log("🔍 访问调试日志端点")
        return {
            'message': '调试日志端点',
            'timestamp': datetime.now().isoformat(),
            'environment': {
                'DATABASE_URL': 'SET' if os.getenv('DATABASE_URL') else 'NOT_SET',
                'JWT_SECRET_KEY': 'SET' if os.getenv('JWT_SECRET_KEY') else 'NOT_SET'
            }
        }
    
    debug_log("🎉 Flask应用创建完成")
    return app

# 创建应用实例
app = create_app()

# Vercel Python运行时
if __name__ == '__main__':
    app.run(debug=True)