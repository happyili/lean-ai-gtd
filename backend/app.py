from app.utils.app_factory import create_base_app

def create_app():
    """创建Flask应用 - 本地开发版本"""
    return create_base_app()

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5050) 
