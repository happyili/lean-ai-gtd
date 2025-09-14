"""
统一的日志记录模块
提供标准化的日志记录功能
"""

from datetime import datetime
import os
import logging
import sys
import json


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
        # print(f"[{timestamp}] {level}: {message}")
        # if data:
        #     print(f"[{timestamp}] DATA: {json.dumps(data, ensure_ascii=False, indent=2)}")
        
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
