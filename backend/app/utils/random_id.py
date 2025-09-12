import secrets
import string
import time
from typing import Union

class RandomIDGenerator:
    """
    Random ID generator for secure, non-sequential IDs
    Supports both integer-based and string-based random IDs
    """
    
    # 字符集：避免易混淆字符
    CHARSET = string.ascii_uppercase + string.ascii_lowercase + string.digits
    SAFE_CHARSET = CHARSET.replace('0', '').replace('O', '').replace('I', '').replace('l', '')
    
    @classmethod
    def generate_int_id(cls, bit_length: int = 48) -> int:
        """
        生成随机整数ID
        
        Args:
            bit_length: ID的位长度 (默认48位, 约14位十进制数字)
            
        Returns:
            随机整数ID
        """
        # 确保ID是正数且在指定位数范围内
        max_value = (1 << bit_length) - 1
        min_value = 1 << (bit_length - 1)  # 确保是指定位数
        
        # 生成随机数
        random_id = secrets.randbits(bit_length)
        
        # 确保在指定范围内
        if random_id < min_value:
            random_id += min_value
        elif random_id > max_value:
            random_id = min_value + (random_id % (max_value - min_value + 1))
            
        return random_id
    
    @classmethod
    def generate_string_id(cls, length: int = 12) -> str:
        """
        生成随机字符串ID
        
        Args:
            length: ID长度 (默认12字符)
            
        Returns:
            随机字符串ID
        """
        return ''.join(secrets.choice(cls.SAFE_CHARSET) for _ in range(length))
    
    @classmethod
    def generate_user_id(cls) -> int:
        """生成用户ID (48位随机整数)"""
        return cls.generate_int_id(48)
    
    @classmethod
    def generate_record_id(cls) -> int:
        """生成记录ID (48位随机整数)"""
        return cls.generate_int_id(48)
    
    @classmethod
    def is_valid_id_format(cls, id_value: Union[int, str]) -> bool:
        """
        验证ID格式是否有效
        
        Args:
            id_value: 要验证的ID值
            
        Returns:
            是否为有效格式
        """
        if isinstance(id_value, int):
            # 检查是否在48位范围内
            return 1 << 47 <= id_value < 1 << 48
        elif isinstance(id_value, str):
            # 检查字符串ID是否只包含安全字符集
            return len(id_value) >= 8 and all(c in cls.SAFE_CHARSET for c in id_value)
        return False
    
    @classmethod
    def generate_migration_safe_id(cls) -> int:
        """
        生成迁移安全的ID
        确保不与现有的自增ID冲突
        """
        # 使用时间戳前缀确保唯一性，并添加随机数
        timestamp_prefix = int(time.time() * 1000) % (1 << 32)  # 32位时间戳
        random_suffix = secrets.randbits(16)  # 16位随机数
        
        # 组合成48位ID
        migration_id = (timestamp_prefix << 16) | random_suffix
        
        # 确保在有效范围内
        min_safe_id = 1 << 47  # 确保是48位数
        if migration_id < min_safe_id:
            migration_id += min_safe_id
            
        return migration_id