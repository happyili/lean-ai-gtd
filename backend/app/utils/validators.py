import re
from typing import bool

def validate_email(email: str) -> bool:
    """验证邮箱格式"""
    if not email or not isinstance(email, str):
        return False
    
    # 邮箱正则表达式
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(email_pattern, email) is not None

def validate_username(username: str) -> bool:
    """验证用户名格式"""
    if not username or not isinstance(username, str):
        return False
    
    # 用户名规则：3-20个字符，只能包含字母、数字、下划线和连字符
    username_pattern = r'^[a-zA-Z0-9_-]{3,20}$'
    
    if re.match(username_pattern, username) is None:
        return False
    
    # 不能以数字开头
    if username[0].isdigit():
        return False
    
    # 不能全是数字
    if username.isdigit():
        return False
    
    # 不能包含连续的特殊字符
    if '--' in username or '__' in username:
        return False
    
    return True

def validate_password(password: str) -> bool:
    """验证密码强度"""
    if not password or not isinstance(password, str):
        return False
    
    # 基本长度要求
    if len(password) < 8 or len(password) > 32:
        return False
    
    # 必须包含大写字母
    if not re.search(r'[A-Z]', password):
        return False
    
    # 必须包含小写字母
    if not re.search(r'[a-z]', password):
        return False
    
    # 必须包含数字
    if not re.search(r'\d', password):
        return False
    
    # 必须包含特殊字符
    if not re.search(r'[!@#$%^&*(),.?":{}|]', password):
        return False
    
    # 不能包含空格
    if ' ' in password:
        return False
    
    # 不能是常见弱密码
    weak_passwords = [
        'password', '123456', '12345678', 'qwerty', 'abc123',
        'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ]
    
    if password.lower() in weak_passwords:
        return False
    
    # 不能包含用户名或邮箱的常见部分
    # 这个检查需要在调用时传入用户名/邮箱
    
    return True

def validate_password_with_context(password: str, username: str = None, email: str = None) -> bool:
    """验证密码强度（包含上下文检查）"""
    if not validate_password(password):
        return False
    
    # 不能包含用户名
    if username and username.lower() in password.lower():
        return False
    
    # 不能包含邮箱用户名部分
    if email:
        email_username = email.split('@')[0].lower()
        if email_username and email_username in password.lower():
            return False
    
    # 不能包含连续3个以上的相同字符
    if re.search(r'(.)\1{2,}', password):
        return False
    
    # 不能包含连续3个以上的顺序字符（如abc, 123）
    sequences = ['abcdefghijklmnopqrstuvwxyz', '0123456789', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm']
    password_lower = password.lower()
    
    for sequence in sequences:
        for i in range(len(sequence) - 2):
            if sequence[i:i+3] in password_lower:
                return False
    
    return True

def sanitize_input(input_string: str) -> str:
    """清理输入字符串，防止XSS攻击"""
    if not input_string or not isinstance(input_string, str):
        return ''
    
    # 移除HTML标签
    input_string = re.sub(r'<[^>]*>', '', input_string)
    
    # 移除JavaScript代码
    input_string = re.sub(r'javascript:', '', input_string, flags=re.IGNORECASE)
    
    # 移除事件处理器
    input_string = re.sub(r'on\w+\s*=', '', input_string, flags=re.IGNORECASE)
    
    # 移除危险的字符
    dangerous_chars = ['<', '>', '"', "'", '&']
    for char in dangerous_chars:
        input_string = input_string.replace(char, '')
    
    # 限制长度
    if len(input_string) > 1000:
        input_string = input_string[:1000]
    
    # 去除前后空格
    input_string = input_string.strip()
    
    return input_string

def is_safe_filename(filename: str) -> bool:
    """检查文件名是否安全"""
    if not filename or not isinstance(filename, str):
        return False
    
    # 只允许字母、数字、下划线、连字符和点
    safe_pattern = r'^[a-zA-Z0-9_.-]+$'
    
    if re.match(safe_pattern, filename) is None:
        return False
    
    # 不能包含路径遍历
    if '..' in filename or '/' in filename or '\\' in filename:
        return False
    
    # 不能是系统保留文件名
    reserved_names = [
        'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4',
        'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3',
        'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ]
    
    if filename.upper() in reserved_names:
        return False
    
    return True

def validate_phone_number(phone: str) -> bool:
    """验证手机号格式（中国）"""
    if not phone or not isinstance(phone, str):
        return False
    
    # 中国手机号正则表达式
    china_phone_pattern = r'^1[3-9]\d{9}$'
    
    return re.match(china_phone_pattern, phone) is not None

def validate_chinese_name(name: str) -> bool:
    """验证中文姓名格式"""
    if not name or not isinstance(name, str):
        return False
    
    # 中文姓名正则表达式（2-10个汉字）
    chinese_name_pattern = r'^[一-龥]{2,10}$'
    
    return re.match(chinese_name_pattern, name) is not None

def validate_id_card(id_card: str) -> bool:
    """验证身份证号格式"""
    if not id_card or not isinstance(id_card, str):
        return False
    
    # 身份证号正则表达式（18位）
    id_card_pattern = r'^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$'
    
    if re.match(id_card_pattern, id_card) is None:
        return False
    
    # 验证校验码
    return validate_id_card_checksum(id_card)

def validate_id_card_checksum(id_card: str) -> bool:
    """验证身份证号校验码"""
    if len(id_card) != 18:
        return False
    
    # 权重因子
    weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
    
    # 校验码映射
    check_codes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']
    
    # 计算校验和
    total = 0
    for i in range(17):
        total += int(id_card[i]) * weights[i]
    
    # 获取校验码
    check_code = check_codes[total % 11]
    
    # 比较校验码（不区分大小写）
    return check_code.upper() == id_card[17].upper()

def validate_captcha(captcha: str) -> bool:
    """验证验证码格式"""
    if not captcha or not isinstance(captcha, str):
        return False
    
    # 验证码通常为4-6位字母数字
    captcha_pattern = r'^[A-Za-z0-9]{4,6}$'
    
    return re.match(captcha_pattern, captcha) is not None

def validate_ip_address(ip: str) -> bool:
    """验证IP地址格式"""
    if not ip or not isinstance(ip, str):
        return False
    
    # IP地址正则表达式
    ip_pattern = r'^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
    
    return re.match(ip_pattern, ip) is not None

def validate_user_agent(user_agent: str) -> bool:
    """验证User-Agent格式"""
    if not user_agent or not isinstance(user_agent, str):
        return False
    
    # 基本长度检查
    if len(user_agent) > 500:
        return False
    
    # 检查是否包含明显的恶意内容
    malicious_patterns = [
        r'<script',
        r'javascript:',
        r'onload=',
        r'onerror=',
        r'data:',
        r'vbscript:',
        r'file:',
        r'expect:',
        r'input:',
        r'<iframe',
        r'<object',
        r'<embed',
        r'<form',
        r'<input',
        r'<script',
        r'union\s+select',
        r'exec\s*\(',
        r'script>',
        r'javascript:',
        r'vbscript:',
        r'onload',
        r'onerror',
        r'onclick',
        r'<script'
    ]
    
    for pattern in malicious_patterns:
        if re.search(pattern, user_agent, re.IGNORECASE):
            return False
    
    return True

# 导出函数
__all__ = [
    'validate_email',
    'validate_username', 
    'validate_password',
    'validate_password_with_context',
    'sanitize_input',
    'is_safe_filename',
    'validate_phone_number',
    'validate_chinese_name',
    'validate_id_card',
    'validate_captcha',
    'validate_ip_address',
    'validate_user_agent'
]},// JWT token utilities
