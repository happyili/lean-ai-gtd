from app.utils.app_factory import create_base_app

def create_app():
    """创建Flask应用 - 应用工厂模式"""
    return create_base_app()