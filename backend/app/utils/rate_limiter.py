from functools import wraps
from flask import request, jsonify, g
from datetime import datetime, timedelta
import time
from collections import defaultdict, deque
from threading import Lock

class RateLimiter:
    """简单的内存速率限制器"""
    
    def __init__(self):
        self.requests = defaultdict(lambda: defaultdict(deque))
        self.lock = Lock()
    
    def is_rate_limited(self, key: str, max_requests: int, window: int, identifier: str = None) -> bool:
        """
        检查是否超过速率限制
        
        Args:
            key: 限制键（如IP地址、用户ID等）
            max_requests: 最大请求数
            window: 时间窗口（秒）
            identifier: 额外的标识符
        
        Returns:
            True如果超过限制，False否则
        """
        current_time = time.time()
        
        with self.lock:
            # 构建完整的键
            full_key = f"{key}:{identifier}" if identifier else key
            
            # 清理过期的请求记录
            while self.requests[full_key] and self.requests[full_key][0] < current_time - window:
                self.requests[full_key].popleft()
            
            # 检查当前请求数
            if len(self.requests[full_key]) >= max_requests:
                return True
            
            # 记录当前请求
            self.requests[full_key].append(current_time)
            return False
    
    def get_remaining_time(self, key: str, window: int, identifier: str = None) -> int:
        """获取剩余锁定时间（秒）"""
        full_key = f"{key}:{identifier}" if identifier else key
        
        with self.lock:
            if not self.requests[full_key]:
                return 0
            
            oldest_request = self.requests[full_key][0]
            current_time = time.time()
            remaining_time = int(window - (current_time - oldest_request))
            return max(0, remaining_time)

# 全局速率限制器实例
rate_limiter = RateLimiter()

def rate_limit(max_requests: int = 10, window: int = 60, key_func=None):
    """
    速率限制装饰器
    
    Args:
        max_requests: 最大请求数
        window: 时间窗口（秒）
        key_func: 获取限制键的函数，默认为IP地址
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # 获取限制键
            if key_func:
                key = key_func()
            else:
                # 默认使用IP地址
                key = request.remote_addr or 'unknown'
            
            # 检查是否超过速率限制
            if rate_limiter.is_rate_limited(key, max_requests, window):
                remaining_time = rate_limiter.get_remaining_time(key, window)
                return jsonify({
                    'error': '请求过于频繁，请稍后重试',
                    'retry_after': remaining_time
                }), 429
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

def get_client_identifier() -> str:
    """获取客户端标识符"""
    # 组合IP地址和User-Agent
    ip = request.remote_addr or 'unknown'
    user_agent = request.headers.get('User-Agent', '')
    
    # 如果User-Agent太长，只取前50个字符
    if len(user_agent) > 50:
        user_agent = user_agent[:50]
    
    return f"{ip}:{user_agent}"

def get_user_rate_limit_key(user_id: int = None) -> str:
    """获取用户速率限制键"""
    if user_id:
        return f"user:{user_id}"
    else:
        return get_client_identifier()

# 常见的速率限制配置
RATE_LIMITS = {
    'login': {'max_requests': 5, 'window': 300},      # 5次/5分钟
    'register': {'max_requests': 3, 'window': 3600},  # 3次/小时
    'password_reset': {'max_requests': 3, 'window': 3600},  # 3次/小时
    'api_general': {'max_requests': 100, 'window': 60},     # 100次/分钟
    'api_user': {'max_requests': 50, 'window': 60},         # 50次/分钟
    'email_send': {'max_requests': 10, 'window': 3600},     # 10次/小时
}

# 导出函数
__all__ = ['rate_limit', 'rate_limiter', 'get_client_identifier', 'get_user_rate_limit_key', 'RATE_LIMITS']