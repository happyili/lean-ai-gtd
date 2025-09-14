"""
统一的响应处理工具模块
提供标准化的错误响应和日志记录功能
"""

from flask import jsonify
from datetime import datetime
import os
import logging
import sys


# 统一的错误码定义
class ErrorCodes:
    # 通用错误码 (1000-1999)
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
    VALIDATION_ERROR = 'VALIDATION_ERROR'
    AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR'
    AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR'
    NOT_FOUND = 'NOT_FOUND'
    CONFLICT = 'CONFLICT'
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
    
    # 数据库相关错误码 (2000-2999)
    DATABASE_ERROR = 'DATABASE_ERROR'
    RECORD_NOT_FOUND = 'RECORD_NOT_FOUND'
    DUPLICATE_RECORD = 'DUPLICATE_RECORD'
    
    # 业务逻辑错误码 (3000-3999)
    INVALID_REQUEST_DATA = 'INVALID_REQUEST_DATA'
    MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD'
    INVALID_FIELD_VALUE = 'INVALID_FIELD_VALUE'
    OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED'
    
    # 资源相关错误码 (4000-4999)
    RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND'
    RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS'
    RESOURCE_ACCESS_DENIED = 'RESOURCE_ACCESS_DENIED'
    
    # 用户相关错误码 (5000-5999)
    USER_NOT_FOUND = 'USER_NOT_FOUND'
    USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS'
    INVALID_CREDENTIALS = 'INVALID_CREDENTIALS'
    USER_ACCESS_DENIED = 'USER_ACCESS_DENIED'
    
    # 任务相关错误码 (6000-6999)
    TASK_NOT_FOUND = 'TASK_NOT_FOUND'
    TASK_ALREADY_EXISTS = 'TASK_ALREADY_EXISTS'
    INVALID_TASK_STATUS = 'INVALID_TASK_STATUS'
    INVALID_TASK_PRIORITY = 'INVALID_TASK_PRIORITY'
    
    # 信息资源相关错误码 (7000-7999)
    INFO_RESOURCE_NOT_FOUND = 'INFO_RESOURCE_NOT_FOUND'
    INFO_RESOURCE_ALREADY_EXISTS = 'INFO_RESOURCE_ALREADY_EXISTS'
    INVALID_RESOURCE_TYPE = 'INVALID_RESOURCE_TYPE'
    
    # 提醒相关错误码 (8000-8999)
    REMINDER_NOT_FOUND = 'REMINDER_NOT_FOUND'
    REMINDER_ALREADY_EXISTS = 'REMINDER_ALREADY_EXISTS'
    INVALID_REMINDER_FREQUENCY = 'INVALID_REMINDER_FREQUENCY'
    INVALID_REMINDER_TIME = 'INVALID_REMINDER_TIME'
    
    # 番茄钟相关错误码 (9000-9999)
    POMODORO_TASK_NOT_FOUND = 'POMODORO_TASK_NOT_FOUND'
    POMODORO_SESSION_NOT_FOUND = 'POMODORO_SESSION_NOT_FOUND'
    INVALID_POMODORO_STATE = 'INVALID_POMODORO_STATE'

# 错误码到HTTP状态码的映射
ERROR_CODE_TO_STATUS = {
    ErrorCodes.VALIDATION_ERROR: 400,
    ErrorCodes.AUTHENTICATION_ERROR: 401,
    ErrorCodes.AUTHORIZATION_ERROR: 403,
    ErrorCodes.NOT_FOUND: 404,
    ErrorCodes.CONFLICT: 409,
    ErrorCodes.RATE_LIMIT_EXCEEDED: 429,
    ErrorCodes.DATABASE_ERROR: 500,
    ErrorCodes.UNKNOWN_ERROR: 500,   # All kind of server errors
}

def get_status_code_for_error(error_code: str) -> int:
    """根据错误码获取对应的HTTP状态码"""
    return ERROR_CODE_TO_STATUS.get(error_code, 500)

def create_error_response(error_code: str, error_details: str = None, status_code: int = None, method: str = None, endpoint: str = None) -> tuple:
    """
    创建标准化的错误响应并自动记录日志
    
    Args:
        error_message: 错误消息
        error_code: 错误码
        details: 详细错误信息（可选）
        status_code: HTTP状态码（可选，会根据error_code自动确定）
        method: HTTP方法（可选，用于日志记录）
        endpoint: 端点路径（可选，用于日志记录）
    
    Returns:
        tuple: (jsonify对象, HTTP状态码)
    """
    if status_code is None:
        status_code = get_status_code_for_error(error_code)
    
    # 自动记录错误日志
    if method and endpoint:
        debug_log.request_error(method, endpoint, error_details)
    else:
        debug_log.error(f"❌ {error_details or error_code}")
    
    error_data = {
        'error_code': error_code,
        'details': error_details,
        'timestamp': datetime.utcnow().isoformat() + 'Z'
    }
    
    return jsonify(error_data), status_code

def create_success_response(data: dict = None, message: str = None, method: str = None, endpoint: str = None) -> tuple:
    """
    创建标准化的成功响应并自动记录日志
    
    Args:
        data: 响应数据
        message: 成功消息
        method: HTTP方法（可选，用于日志记录）
        endpoint: 端点路径（可选，用于日志记录）
    
    Returns:
        tuple: (jsonify对象, HTTP状态码)
    """
    # 自动记录成功日志
    if method and endpoint:
        debug_log.request_success(method, endpoint, data)
    else:
        debug_log.info(f"✅ {message or '操作成功'}", data)
    
    response_data = {
        'success': True,
        'timestamp': datetime.utcnow().isoformat() + 'Z'
    }
    
    if data is not None:
        response_data.update(data)
    
    if message is not None:
        response_data['message'] = message
    
    return jsonify(response_data), 200



class Logger:
    """统一的日志记录器"""
    
    @staticmethod
    def setup_logging():
        """设置日志系统"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[logging.StreamHandler(sys.stdout)]
        )
        return logging.getLogger(__name__)


    def __init__(self):
        # 从环境变量读取日志配置
        self.enabled = os.getenv('DEBUG_LOGGING', 'true').lower() == 'true'
        self.verbose = os.getenv('VERBOSE_LOGGING', 'false').lower() == 'true'
        self.logger = Logger.setup_logging()
    

    def log(self, message, data=None, level='INFO'):
        """统一的调试日志函数"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = {
            'timestamp': timestamp,
            'level': level,
            'message': message,
            'data': data
        }
        
        # 输出到stdout（Vercel会捕获）
        #print(f"[{timestamp}] {level}: {message}")
        #if data:
            #print(f"[{timestamp}]   DATA: {json.dumps(data, ensure_ascii=False, indent=2)}")
        
        # 同时使用Python logging
        if level == 'ERROR':
            self.logger.error(f"{message} - {data}")
        elif level == 'WARNING':
            self.logger.warning(f"{message} - {data}")
        else:
            self.logger.info(f"{message} - {data}")


    def info(self, message: str, data: any = None):
        """记录INFO级别日志"""
        self.log(message, data, 'INFO')
    
    def error(self, message: str, data: any = None):
        """记录ERROR级别日志"""
        self.log(message, data, 'ERROR')
    
    def warning(self, message: str, data: any = None):
        """记录WARNING级别日志"""
        self.log(message, data, 'WARNING')
    
    def debug(self, message: str, data: any = None):
        """记录DEBUG级别日志"""
        self.log(message, data, 'DEBUG')
    
    def request_start(self, method: str, endpoint: str, data: any = None):
        """记录请求开始"""
        self.info(f"🔍 {method} {endpoint} - 开始处理请求", data)
    
    def request_success(self, method: str, endpoint: str, data: any = None):
        """记录请求成功"""
        self.info(f"✅ {method} {endpoint} - 请求处理成功", data)
    
    def request_error(self, method: str, endpoint: str, error: str, data: any = None):
        """记录请求错误"""
        self.error(f"❌ {method} {endpoint} - {error}", data)
    
    def validation_error(self, field: str, message: str):
        """记录验证错误"""
        self.error(f"❌ 验证失败: {field} - {message}")
    
    def database_error(self, operation: str, error: str):
        """记录数据库错误"""
        self.error(f"❌ 数据库操作失败: {operation} - {error}")
    
    def auth_error(self, operation: str, error: str):
        """记录认证错误"""
        self.error(f"❌ 认证失败: {operation} - {error}")

# 创建全局日志记录器实例
debug_log = Logger()
