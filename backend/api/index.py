import os
import sys

# 添加backend路径到sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.utils.app_factory import create_base_app

def create_app():
    """创建Flask应用 - Vercel生产版本"""
    return create_base_app()

# 创建应用实例
app = create_app()

# Vercel Python运行时
if __name__ == '__main__':
    app.run(debug=True)
